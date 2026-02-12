import json

from fastapi import APIRouter, Request
from pydantic import BaseModel
from loguru import logger

from agent.agent_prompt import SYSTEM_PROMPT
from agent.agent_tools import TOOLS
from agent.tool_executor import execute_tool
from services.key_store import get_key

router = APIRouter(prefix='/api', tags=['chat'])

MODEL_PROVIDERS = {
    # OpenAI — GPT-5.x
    'gpt-5.2': 'openai',
    'gpt-5': 'openai',
    'gpt-5-mini': 'openai',
    'gpt-5-nano': 'openai',
    # OpenAI — GPT-4.x
    'gpt-4.1': 'openai',
    'gpt-4.1-mini': 'openai',
    'gpt-4.1-nano': 'openai',
    'gpt-4o': 'openai',
    'gpt-4o-mini': 'openai',
    # OpenAI — o-series
    'o3': 'openai',
    'o3-mini': 'openai',
    'o4-mini': 'openai',
    # Anthropic
    'claude-opus-4.6': 'anthropic',
    'claude-sonnet-4.5': 'anthropic',
    'claude-4-opus': 'anthropic',
    'claude-4-sonnet': 'anthropic',
    'claude-4-haiku': 'anthropic',
    'claude-3.5-sonnet': 'anthropic',
    'claude-3.5-haiku': 'anthropic',
    # Google
    'gemini-3-pro-preview': 'google',
    'gemini-3-flash-preview': 'google',
    'gemini-2.5-pro': 'google',
    'gemini-2.5-flash': 'google',
    'gemini-2.5-flash-lite': 'google',
    'gemini-2.0-flash': 'google',
}


class ChatRequest(BaseModel):
    message: str
    config: dict = {}
    history: list = []
    session_id: str = None


async def _call_openai(model, messages, tools):
    """Call OpenAI-compatible API with function calling."""
    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise ImportError('openai package not installed. Run: pip install openai')

    client = AsyncOpenAI(api_key=get_key('openai'))
    kwargs = dict(model=model, messages=messages, tools=tools)
    if not model.startswith(('o1', 'o3', 'o4', 'gpt-5')):
        kwargs['temperature'] = 0.7
    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message


async def _call_anthropic(model, messages, tools):
    """Call Anthropic API with tool use."""
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        raise ImportError('anthropic package not installed. Run: pip install anthropic')

    client = AsyncAnthropic(api_key=get_key('anthropic'))

    anthropic_tools = []
    for tool in tools:
        func = tool['function']
        anthropic_tools.append({
            'name': func['name'],
            'description': func['description'],
            'input_schema': func['parameters'],
        })

    system_message = None
    chat_messages = []
    for msg in messages:
        if msg['role'] == 'system':
            system_message = msg['content']
        else:
            chat_messages.append(msg)

    response = await client.messages.create(
        model=model,
        system=system_message or '',
        messages=chat_messages,
        tools=anthropic_tools,
        max_tokens=4096,
        temperature=0.7,
    )

    # Normalize Anthropic response to OpenAI-like format
    text_content = ''
    tool_calls = []
    for block in response.content:
        if block.type == 'text':
            text_content += block.text
        elif block.type == 'tool_use':
            tool_calls.append({
                'id': block.id,
                'type': 'function',
                'function': {
                    'name': block.name,
                    'arguments': json.dumps(block.input),
                },
            })

    class NormalizedMessage:
        def __init__(self, content, tool_calls):
            self.content = content or None
            self.tool_calls = tool_calls or None

        def model_dump(self):
            result = {'role': 'assistant', 'content': self.content}
            if self.tool_calls:
                result['tool_calls'] = self.tool_calls
            return result

    return NormalizedMessage(text_content, tool_calls)


async def _call_google(model, messages, tools):
    """Call Google Gemini API with function calling."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise ImportError('google-genai package not installed. Run: pip install google-genai')

    client = genai.Client(api_key=get_key('google'))

    gemini_tools = []
    for tool in tools:
        func = tool['function']
        gemini_tools.append(types.Tool(
            function_declarations=[types.FunctionDeclaration(
                name=func['name'],
                description=func['description'],
                parameters=func['parameters'],
            )]
        ))

    system_instruction = None
    contents = []
    for msg in messages:
        if msg['role'] == 'system':
            system_instruction = msg['content']
        elif msg['role'] == 'user':
            contents.append(types.Content(role='user', parts=[types.Part.from_text(text=msg['content'])]))
        elif msg['role'] == 'assistant':
            contents.append(types.Content(role='model', parts=[types.Part.from_text(text=msg['content'])]))

    response = await client.aio.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=gemini_tools,
            temperature=0.7,
        ),
    )

    text_content = ''
    tool_calls = []
    for candidate in response.candidates:
        for part in candidate.content.parts:
            if part.text:
                text_content += part.text
            elif part.function_call:
                fc = part.function_call
                tool_calls.append({
                    'id': f'gemini_{fc.name}',
                    'type': 'function',
                    'function': {
                        'name': fc.name,
                        'arguments': json.dumps(dict(fc.args)) if fc.args else '{}',
                    },
                })

    class NormalizedMessage:
        def __init__(self, content, tool_calls):
            self.content = content or None
            self.tool_calls = tool_calls or None

        def model_dump(self):
            result = {'role': 'assistant', 'content': self.content}
            if self.tool_calls:
                result['tool_calls'] = self.tool_calls
            return result

    return NormalizedMessage(text_content, tool_calls)


async def _call_llm(model, messages, tools):
    """Route to the correct provider based on model ID."""
    provider = MODEL_PROVIDERS.get(model, 'openai')
    if provider == 'anthropic':
        return await _call_anthropic(model, messages, tools)
    elif provider == 'google':
        return await _call_google(model, messages, tools)
    else:
        return await _call_openai(model, messages, tools)


@router.post('/chat')
async def chat(request: ChatRequest, raw_request: Request):
    """
    Chat endpoint with LLM function-calling loop.
    The agent receives a system prompt and tools, and can invoke backend
    services (GCRI runner, memory) through tool calls.
    """
    ws_manager = raw_request.app.state.ws_manager

    chat_model = request.config.get('chatModel', 'gpt-4o')
    config = request.config

    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]

    config_summary = (
        f'Current config: {config.get("branchCount", 3)} branches. '
        f'Chat model: {chat_model}. '
        f'Session ID: {request.session_id or "default"}.'
    )
    messages[0]['content'] += f'\n\n## Current User Config\n{config_summary}'

    for entry in request.history[-20:]:
        role = entry.get('role', 'user')
        if role in ('user', 'assistant'):
            messages.append({'role': role, 'content': entry.get('content', '')})

    messages.append({'role': 'user', 'content': request.message})

    max_tool_rounds = 5
    tool_calls_made = []

    try:
        for _ in range(max_tool_rounds):
            assistant_message = await _call_llm(chat_model, messages, TOOLS)

            if not assistant_message.tool_calls:
                return {
                    'reply': assistant_message.content or '',
                    'tool_calls': tool_calls_made,
                }

            messages.append(assistant_message.model_dump())

            for tool_call in assistant_message.tool_calls:
                func = tool_call['function']
                tool_name = func['name']
                try:
                    arguments = json.loads(func.get('arguments', '{}'))
                except json.JSONDecodeError:
                    arguments = {}

                result = await execute_tool(tool_name, arguments, config, ws_manager)
                tool_calls_made.append({
                    'tool': tool_name,
                    'arguments': arguments,
                    'result': result,
                })

                messages.append({
                    'role': 'tool',
                    'tool_call_id': tool_call.get('id', tool_name),
                    'content': result,
                })

        final = await _call_llm(chat_model, messages, TOOLS)
        return {
            'reply': final.content or 'Task processing complete.',
            'tool_calls': tool_calls_made,
        }

    except ImportError as error:
        logger.error(f'Missing dependency: {error}')
        return {
            'reply': f'⚠️ {error}',
            'tool_calls': [],
        }
    except Exception as error:
        logger.error(f'Chat error: {error}')
        return {
            'reply': f'Error communicating with the LLM: {str(error)}',
            'tool_calls': [],
        }
