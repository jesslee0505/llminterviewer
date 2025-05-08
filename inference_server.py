"""
Before running, do:
    pip install transformers fastapi uvicorn bitsandbytes

And then run the server with:
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    pipeline,
)
import torch

class GenRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 200
    temperature: float = 0.7

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

MODEL_ID = "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B"

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_ID,
    trust_remote_code=True
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    load_in_8bit=True,
    device_map="auto",
    torch_dtype=torch.float16,
    trust_remote_code=True
)

pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    device_map="auto",
)

@app.post("/generate")
async def generate(req: GenRequest):
    try:
        out = pipe(
            req.prompt,
            max_new_tokens=req.max_new_tokens,
            temperature=req.temperature,
            do_sample=True,
            top_p=0.9,
            repetition_penalty=1.1,
            no_repeat_ngram_size=3,
            return_full_text=False,
        )
        return {"generated_text": out[0]["generated_text"].strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
