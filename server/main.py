from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
from database import *

app = FastAPI()

@app.get("/test")
async def root():
    return {"text": "privet mir"}

@app.post("/new_pos")
async def insert_new_pos():
    pass

@app.get("/get_all")
async def get_all_pos():
    pass


if(__name__ == "__main__"):
    uvicorn.run("main:app", host="0.0.0.0", port=80, reload=True)