from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
from database import *
import bcrypt

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для разработки, в продакшене укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/market/create")
async def create_pos():
    await marketpos_table.create_table()
    return {"status": "ok"}

@app.post("/market/insert")
async def insert_table_marketpos(product_name: str, count_pos: int, price: Decimal):
    try:
        await marketpos_table.insert_into_table(product_name, count_pos, price)
        return {"status": "ok"}
    except:
        return {"status": "false"}

@app.get("/market/get_data")
async def get_data_market():
   res =  await marketpos_table.get_data()
   return res

@app.delete("/market/del_pos")
async def del_position(product_name: str):
    try:
        await marketpos_table.deleted_row(product_name)
        return {"status": "ok"}
    except:
        return {"status": "false"}

@app.post("/basket/create")
async def create_basket():
    res = {"status": True}
    try:
        await basket_table.create_table()
    except:
        res["status"] = False
    return res

@app.get("/basket/data")
async def get_basket_data():
    res = await basket_table.get_data()
    return res

@app.post("/basket/insert")
async def insert_into_basket_table(userId: int, product_name: str, cur_count: int):
    res =  await basket_table.insert_into_table(userId, product_name, cur_count)
    return res

@app.post("/orders/create")
async def create_orders():
    res = {"status": True}
    try:
        await order_table.create_table()
    except:
        res["status"] = False
    return res

@app.post("/orders/insert")
async def insert_into_orders_table(userId: int):
    await order_table.insert_into_table(userId)
    return {"status": True}

if(__name__ == "__main__"):
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
