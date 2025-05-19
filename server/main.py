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

@app.get("/create_table_users")
async def create():
    await user_table.create_table()

if(__name__ == "__main__"):
    uvicorn.run("main:app", host="localhost", port=8001, reload=True)