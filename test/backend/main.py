import asyncio
import json
import os
import random

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from openai import AsyncOpenAI

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


def sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


TOOLS = [
    {
        "type": "function",
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string", "description": "City name"}},
            "required": ["city"],
        },
    },
    {
        "type": "function",
        "name": "calculate",
        "description": "Evaluate a math expression",
        "parameters": {
            "type": "object",
            "properties": {"expression": {"type": "string", "description": "Math expression"}},
            "required": ["expression"],
        },
    },
    {
        "type": "function",
        "name": "search_knowledge",
        "description": "Search a knowledge base for information",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "limit": {"type": "number", "description": "Max results"},
            },
            "required": ["query"],
        },
    },
]

ICON_MAP = {
    "get_weather": "cloud",
    "calculate": "calculator",
    "search_knowledge": "search",
}

SYSTEM_PROMPT = """You are a helpful assistant for testing an LLM chat UI library.
You have access to tools: get_weather, calculate, and search_knowledge.
Use them when relevant to the user's question. Feel free to use multiple tools in one response.
Keep responses concise but informative. Use markdown formatting.

At the end of every response, include 2-3 suggested follow-up questions in this exact format:

:::actions
["suggested question 1", "suggested question 2", "suggested question 3"]
:::"""


def execute_tool(name: str, args: dict) -> str:
    if name == "get_weather":
        city = args.get("city", "Unknown")
        temp = random.randint(5, 35)
        conditions = ["sunny", "cloudy", "rainy", "partly cloudy", "windy"]
        return json.dumps({
            "city": city,
            "temperature": f"{temp}C",
            "condition": random.choice(conditions),
            "humidity": f"{random.randint(30, 90)}%",
        })
    elif name == "calculate":
        expr = args.get("expression", "0")
        try:
            result = eval(expr)
            return json.dumps({"expression": expr, "result": result})
        except Exception:
            return json.dumps({"expression": expr, "error": "Invalid expression"})
    elif name == "search_knowledge":
        query = args.get("query", "")
        limit = int(args.get("limit", 3))
        results = [
            {
                "id": i + 1,
                "title": f'Result {i + 1} for "{query}"',
                "snippet": f"Simulated knowledge base result about {query}.",
                "relevance": round(random.uniform(0.6, 1.0), 2),
            }
            for i in range(min(limit, 5))
        ]
        return json.dumps({"query": query, "count": len(results), "results": results})
    return json.dumps({"error": "Unknown tool"})


async def generate_openai_stream(message: str, history: list[dict]):
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    messages = []
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    previous_response_id = None
    tool_outputs = []

    while True:
        create_kwargs = {
            "model": "gpt-5.4-mini",
            "instructions": SYSTEM_PROMPT,
            "tools": TOOLS,
            "stream": True,
            "reasoning": {"effort": "medium", "summary": "auto"},
        }

        if previous_response_id:
            create_kwargs["previous_response_id"] = previous_response_id
            create_kwargs["input"] = tool_outputs
        else:
            create_kwargs["input"] = messages

        response = await client.responses.create(**create_kwargs)

        pending_calls: dict[str, dict] = {}
        has_tool_call = False
        response_id = None
        tool_outputs = []
        current_args = ""

        async for event in response:
            if event.type == "response.created":
                response_id = event.response.id

            elif event.type == "response.reasoning_summary_text.delta":
                yield sse_event({"type": "reasoning", "delta": event.delta})

            elif event.type == "response.output_text.delta":
                yield sse_event({"type": "text_delta", "delta": event.delta})

            elif event.type == "response.output_item.added":
                if hasattr(event.item, "name") and event.item.name:
                    pending_calls[event.item.id] = {
                        "name": event.item.name,
                        "call_id": getattr(event.item, "call_id", event.item.id),
                    }
                    current_args = ""

            elif event.type == "response.function_call_arguments.delta":
                current_args += event.delta

            elif event.type == "response.function_call_arguments.done":
                has_tool_call = True
                item_id = event.item_id
                tool_info = pending_calls.get(item_id, {})
                tool_name = tool_info.get("name", "")
                call_id = tool_info.get("call_id", item_id)

                try:
                    parsed_args = json.loads(event.arguments)
                except json.JSONDecodeError:
                    parsed_args = {}

                tid = f"tool-{id(event)}"
                yield sse_event({
                    "type": "tool_start",
                    "id": tid,
                    "name": tool_name,
                    "icon": ICON_MAP.get(tool_name),
                    "args": parsed_args,
                })

                result = execute_tool(tool_name, parsed_args)
                parsed = json.loads(result)
                count = parsed.get("count") or (len(parsed.get("results", [])) if "results" in parsed else 1)

                summary_parts = [
                    f"{k}: {v}" for k, v in parsed.items() if k != "results"
                ]
                yield sse_event({
                    "type": "tool_done",
                    "id": tid,
                    "count": count,
                    "summary": "\n".join(summary_parts),
                })

                tool_outputs.append({
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": result,
                })

        previous_response_id = response_id

        if not has_tool_call:
            break

    yield sse_event({"type": "done"})


async def generate_mock_stream(message: str):
    yield sse_event({"type": "reasoning", "delta": "**Analyzing the question**\n"})
    await asyncio.sleep(0.3)
    yield sse_event({"type": "reasoning", "delta": f"The user asked: {message}\n"})
    await asyncio.sleep(0.2)

    tool_names = ["web_search", "code_analysis", "document_lookup"]
    tool_name = random.choice(tool_names)
    tool_id = f"tool-{random.randint(1000, 9999)}"
    yield sse_event({"type": "tool_start", "id": tool_id, "name": tool_name, "args": {"query": message}})
    await asyncio.sleep(0.8)
    result_count = random.randint(3, 12)
    yield sse_event({"type": "tool_done", "id": tool_id, "count": result_count, "summary": f"Found {result_count} relevant results"})
    await asyncio.sleep(0.2)

    full_text = f"Here's what I found.\n\nYou said: **{message}**\n\n"
    full_text += f"- The {tool_name} returned {result_count} results\n"
    full_text += "- All results have been analyzed\n"

    for char in full_text:
        yield sse_event({"type": "text_delta", "delta": char})
        await asyncio.sleep(0.01)

    actions = ["Tell me more", "What else?", "Explain differently"]
    actions_block = f'\n\n:::actions\n{json.dumps(actions)}\n:::'
    for char in actions_block:
        yield sse_event({"type": "text_delta", "delta": char})
        await asyncio.sleep(0.005)

    yield sse_event({"type": "done"})


@app.get("/api/chat")
async def chat_mode():
    has_key = bool(OPENAI_API_KEY)
    return JSONResponse({"mode": "openai (gpt-5.4-mini)" if has_key else "mock"})


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if OPENAI_API_KEY:
        gen = generate_openai_stream(req.message, req.history)
    else:
        gen = generate_mock_stream(req.message)

    return StreamingResponse(
        gen,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
