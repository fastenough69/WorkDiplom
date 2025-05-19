from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
from database import *
import bcrypt

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
    return {"status": "ok"}

@app.post("/insert")
async def insert_db(name: str, passwd: str, admin: bool):
    passwd = passwd.encode("utf-8")
    hashed = bcrypt.hashpw(passwd, bcrypt.gensalt())
    await user_table.insert_into_table(name, Decimal(0), hashed, admin)
    return {"status": "ok"}

@app.get("/get_users")
async def get_all_users():
    data =  await user_table.get_data()
    return data


if(__name__ == "__main__"):
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
