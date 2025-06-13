from fastapi import FastAPI, Body, UploadFile
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import asyncio
from database import *
import bcrypt
from decimal import Decimal
from authx import AuthX, AuthXConfig, RequestToken
import os
import dotenv

dotenv.load_dotenv()

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://0.0.0.0:8002", "http://localhost:8002", "http://localhost:8003"], 
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        )

config = AuthXConfig()
config.JWT_SECRET_KEY = str(os.getenv("JWT_KEY"))
config.JWT_TOKEN_LOCATION = ["cookie"]
auth = AuthX(config=config)
auth.handle_errors(app)

@app.on_event("startup")
async def startup():
    await connect()
    await admin_table.create_table()
    await user_table.create_table()
    await marketpos_table.create_table()
    await basket_table.create_table()
    await order_table.create_table()


@app.on_event("shutdown")
async def shutdown():
    await destroy_conn()

@app.get("/admins/create")
async def create_table_admins():
    await admin_table.create_table()
    return {"status": True}

@app.post("/admins/insert")
async def insert_into_admins(login: str, passwd: str):
    await admin_table.insert_into_table(login, passwd)
    return {"status": True}

@app.get("/admins/check_user")
async def check_admins(login: str, passwd: str):
    temp = await admin_table.check_user(login, passwd)
    if(temp):
        token = auth.create_access_token(uid=login)
        response = JSONResponse(content={"success": True})
        response.set_cookie(key="access-token",
                            value=token,
                            httponly=False,
                            samesite="Lax",
                            path="/",
                            max_age=3600,
                            secure=False,
                            )
        return response


@app.get("/users/create_table")
async def create_table_users():
    await user_table.create_table()
    return {"status": True}

@app.post("/users/insert")
async def insert_db(phone: str, passwd: str):
    passwd = passwd.encode("utf-8")
    hashed = bcrypt.hashpw(passwd, bcrypt.gensalt())
    await user_table.insert_into_table(phone, hashed)
    return {"status": True}

@app.get("/users/get_users")
async def get_all_users():
    data =  await user_table.get_data()
    return data

@app.get("/users/get_id")
async def get_user_id(phone: str):
    res = await user_table.get_id_user(phone)
    return {"id": res}

@app.get("/users/get_user")
async def get_user(userId: int):
    res = await user_table.get_user(userId)
    return res

@app.put("/users/update")
async def up_user_info(data = Body()):
    userId = data["id"]
    new_phone = data["phone"]
    await user_table.up_user(int(userId), new_phone)
    return {"status": True}

@app.delete("/users/delete")
async def del_user(userId: int):
    await user_table.deleted_row(userId)
    return {"status": True}

@app.get("/users/check")
async def check_in_table_users(phone: str, passwd: str):
    temp = await user_table.check_user(phone, passwd)
    if(temp):
        token = auth.create_access_token(uid=phone)
        response = JSONResponse(content={"success": True})
        response.set_cookie(key="access-token",
                            value=token,
                            httponly=False,
                            samesite="Lax",
                            path="/",
                            max_age=3600,
                            secure=False,
                            )
        return response

@app.get("/market/create")
async def create_pos():
    await marketpos_table.create_table()
    return {"status": True}

@app.post("/market/insert")
async def insert_table_marketpos(product_name: str, description: str, count_pos: int, price: Decimal):
    try:
        await marketpos_table.insert_into_table(product_name, description, count_pos, price)
        return {"status": "ok"}
    except:
        return {"status": "false"}

@app.post("/market/insert/picture")
async def insert_picture(up_file: UploadFile, productId: int):
    os.makedirs("/MarketPicture", exist_ok=True)
    file = up_file.file
    temp = await marketpos_table.get_product_info(productId)
    market_name = temp["row"][1]
    with open(f"/MarketPicture/{market_name}.jpeg", "wb") as fl:
        fl.write(file.read())
    return {"status": True}

@app.get("/market/get_data")
async def get_data_market():
    res =  await marketpos_table.get_data()
    return res

@app.get("/market/get/picture")
async def get_product_picture(productId: int):
    temp = await marketpos_table.get_product_info(productId)
    filename = temp["row"][1]
    return FileResponse(f"/MarketPicture/{filename}.jpeg", media_type="image/jpeg")

@app.get("/market/get_product")
async def get_product(productId: int):
    res = await marketpos_table.get_product_info(productId)
    return res

@app.put("/market/update")
async def update_market_pos(data = Body()):
    productId = int(data["id"])
    product_name = data["product_name"]
    description = data["description"]
    price = data["price"]
    cur_count_pos = data["cur_count_pos"]
    await marketpos_table.up_data_product(productId, product_name, description, price, cur_count_pos)
    return {"status": True}

@app.delete("/market/del_pos")
async def del_position(product_name: str):
    try:
        await marketpos_table.deleted_row(product_name)
        return {"status": "ok"}
    except:
        return {"status": "false"}

@app.put("/market/up_quanity")
async def up_quanity_market(product_name: str, new_quianity: int):
    try:
        await marketpos_table.change_quanity(product_name, new_quianity)
        return {"status": True}
    except:
        return {"status": False}

@app.get("/basket/create")
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

@app.get("/basket/get_basket_user")
async def get_basket_user(userId: int):
    res = await basket_table.get_basket_user(userId)
    return res

@app.post("/basket/insert")
async def insert_into_basket_table(userId: int, product_name: str, cur_count: int):
    res =  await basket_table.insert_into_table(userId, product_name, cur_count)
    return res

@app.delete("/basket/remove_item")
async def remove_item_in_basket(product_name: str, userId: int):
    await basket_table.deleted_row(product_name, userId)
    return {"status": "ok"}

@app.put("/basket/change_count_pos")
async def change_count_pos(product_name: str, new_count_pos: int):
    try:
        await basket_table.change_quanity(product_name, new_count_pos)
        return {"status": True}
    except:
        return {"status": False}


@app.get("/orders/create")
async def create_orders():
    res = {"status": True}
    try:
        await order_table.create_table()
    except:
        res["status"] = False
    return res

@app.post("/orders/insert")
async def insert_into_orders_table(data = Body()):
    userId = int(data["userId"])
    await order_table.insert_into_table(userId)
    return {"status": True}

@app.get("/orders/get_data")
async def get_all_orders():
    res = await order_table.get_data()
    return res

@app.get("/orders/get_user_orders")
async def get_orders_by_user(userId: int):
    res = await order_table.get_user_orders(userId)
    return res

if(__name__ == "__main__"):
    uvicorn.run("main:app", host=os.getenv("HOST_APP"), port=int(os.getenv("APP_PORT_IN")), reload=True)
