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

@app.get("/users/create_table")
async def create_table_users():
    await user_table.create_table()
    return {"status": "ok"}

@app.post("/users/insert")
async def insert_db(name: str, passwd: str, admin: bool):
    passwd = passwd.encode("utf-8")
    hashed = bcrypt.hashpw(passwd, bcrypt.gensalt())
    await user_table.insert_into_table(name, Decimal(0), hashed, admin)
    return {"status": "ok"}

@app.get("/users/get_users")
async def get_all_users():
    data =  await user_table.get_data()
    return data

@app.get("/users/is_admin")
async def res_is_admin(id: int):
    res = await user_table.is_admin(id)
    return res

if(__name__ == "__main__"):
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
