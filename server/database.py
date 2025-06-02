import asyncpg
import asyncio
from decimal import Decimal
import dotenv
import os
import abc
import bcrypt

pool = None

async def connect():
    global pool
    config = {"user": "admin", "password": "856901", "database":"AppMarketAutodetails", "host": "db"}
    pool = await asyncpg.create_pool(**config)

async def destroy_conn():
    await pool.close()

class Table(abc.ABC):
    def __init__(self, name_table: str):
        self.nametable = name_table

    async def create_table(self):
        ...

    async def insert_into_table(self):
        ...

    async def get_data(self):
        ...

    async def deleted_row(self):
        ...

class TableAdmins(Table):
    def __init__(self, name_table: str="Admins"):
        super().__init__(name_table)

    async def create_table(self):
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, login VARCHAR(30), password bytea)  """)

    async def insert_into_table(self, login: str, passwd: str):
        passwd = passwd.encode("utf-8")
        hashed = bcrypt.hashpw(passwd, bcrypt.gensalt())
        async with pool.acquire() as conn:
            await conn.execute(""" INSERT INTO admins (login, password) VALUES($1, $2)  """, login, hashed)

    async def check_user(self, login: str, passwd: str):
        result = False
        async with pool.acquire() as conn:
            res = await conn.fetchrow(""" SELECT login, password FROM admins WHERE login = $1 """, login)
            passwd = passwd.encode("utf-8")
            if(bcrypt.checkpw(passwd, res["password"])):
                result = True
            return result

class TableUsers(Table):
    def __init__(self, name_table: str="Users"):
        super().__init__(name_table)

    async def create_table(self):
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS users ( id SERIAL PRIMARY KEY, phone TEXT, password bytea) """)

    async def insert_into_table(self, number: str, passwd: bytes):
        async with pool.acquire() as conn:
            await conn.execute(""" INSERT INTO users (phone, password) VALUES($1, $2) """, number, passwd)

    async def get_id_user(self, phone: str):
        async with pool.acquire() as conn:
            _id = await conn.fetchval(""" SELECT id FROM users WHERE phone = $1 """, phone)
            if(phone):
                return _id
            return False

    async def get_data(self) -> dict:
        async with pool.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT (id, phone) FROM users """)]
            return dicts
        
    async def get_user(self, userId: int):
        async with pool.acquire() as conn:
            res = await conn.fetchrow(""" SELECT (id, phone) FROM users WHERE id = $1 """, userId)
            return res
        
    async def up_user(self, userId: int, new_phone: str):
        async with pool.acquire() as conn:
            await conn.execute(""" UPDATE users SET phone = $1 WHERE id = $2 """, new_phone, userId)

    async def check_user(self, phone: str, passwd: str) -> bool:
        result = False
        async with pool.acquire() as conn:
            res = await conn.fetchrow(""" SELECT phone, password FROM users WHERE phone = $1 """, phone)
            passwd = passwd.encode("utf-8")
            if(bcrypt.checkpw(passwd, res["password"])):
                result = True
            return result

    async def deleted_row(self, userId: int):
        async with pool.acquire() as conn:
            await conn.execute(""" DELETE FROM users WHERE id = $1  """, userId)

class TableBasket(Table):
    def __init__(self, name_table: str="basket"):
        super().__init__(name_table)

    async def create_table(self):
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS basket (
                                id SERIAL PRIMARY KEY,
                                userId INTEGER NOT NULL REFERENCES users(id),
                                marketPosId INTEGER NOT NULL REFERENCES marketPos(id),
                                user_count_pos INTEGER DEFAULT 1,
                                UNIQUE(userId, marketPosId)
                            )  """)

    async def get_data(self) -> dict:
        async with pool.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT basket.user_count_pos, marketPos.product_name FROM basket JOIN marketPos ON marketPos.id = basket.id JOIN users ON users.id=basket.userId  """)]
        return dicts

    async def get_basket_user(self, userId: int):
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                                    SELECT b.user_count_pos, m.product_name 
                                    FROM basket b
                                    JOIN marketPos m ON m.id = b.marketPosId
                                    JOIN users u ON u.id = b.userId
                                    WHERE b.userId = $1
                                    """, userId)
        dicts = [dict(row) for row in rows]
        return dicts

    async def insert_into_table(self, userId: int, product_name: str, cur_count: int):
        res = {"status": True}
        async with pool.acquire() as conn:
            try:
                await conn.execute(""" INSERT INTO basket (userId, marketPosId, user_count_pos) VALUES ($1, (SELECT id FROM marketPos WHERE product_name = $2 LIMIT 1), $3) """, userId, product_name, cur_count)
            except:
                res["status"] = False
            return res

    async def deleted_row(self, product_name: str, userId: int):
        async with pool.acquire() as conn:
            await conn.execute(""" DELETE FROM basket WHERE marketPosId IN (SELECT id FROM marketPos WHERE product_name = $1)
                               AND basket.userId = $2""", product_name, userId)

    async def change_quanity(self, product_name: str, new_count_pos: int):
        async with pool.acquire() as conn:
            await conn.execute(""" UPDATE basket SET user_count_pos = $1  WHERE marketPosId IN (SELECT id FROM marketPos WHERE product_name = $2) """, new_count_pos, product_name)

class TableMarketPosition(Table):
    def __init__(self, name_table: str="marketPos"):
        super().__init__(name_table)

    async def create_table(self):
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS marketPos 
                               (id SERIAL PRIMARY KEY, product_name TEXT, description VARCHAR(100), 
                               cur_count_pos INTEGER, price numeric) """)

    async def insert_into_table(self, product_name: str, description: str, count_pos: int, price: Decimal):
        async with pool.acquire() as conn:
            await conn.execute(""" INSERT INTO marketPos (product_name, description, cur_count_pos, price) VALUES($1, $2, $3, $4) """, product_name, description, count_pos, price)

    async def get_data(self) -> dict:
        async with pool.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT id, product_name, description, cur_count_pos, price FROM marketPos  """)]
            return dicts
        
    async def get_product_info(self, productId: int):
        async with pool.acquire() as conn:
            res = await conn.fetchrow(""" SELECT (id, product_name, description, price, cur_count_pos) FROM marketPos WHERE id = $1 """, productId)
            return res
        
    async def up_data_product(self, productId: int, product_name: str, description: str, price: Decimal, cur_count_pos: int):
        async with pool.acquire() as conn:
            await conn.execute(""" UPDATE marketPos SET product_name = $1, description = $2, price = $3, cur_count_pos = $4 WHERE id = $5 """, product_name, description, price, cur_count_pos, productId)

    async def deleted_row(self, product_name_del: str):
        async with pool.acquire() as conn:
            await conn.execute(""" DELETE FROM  basket WHERE marketPosId IN (SELECT id FROM marketPos WHERE product_name = $1) """, product_name_del)
            await conn.execute(""" DELETE FROM marketPos WHERE product_name = $1  """, product_name_del)

    async def change_quanity(self, product_name: str, new_quianity: int):
        async with pool.acquire() as conn:
            await conn.execute(""" UPDATE marketPos SET cur_count_pos = $2 WHERE product_name = $1 """, product_name, new_quianity)

class TableOrders(Table):
    def __init__(self, name_table: str="orders"):
        super().__init__(name_table)

    async def create_table(self):
        async with pool.acquire() as conn:
            await conn.execute("""
                                CREATE TABLE IF NOT EXISTS orders (
                                id SERIAL PRIMARY KEY, 
                                userId INTEGER NOT NULL REFERENCES users(id),
                                productIds INTEGER[],
                                total_price numeric,
                                date_orders timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                status TEXT
                                )
                            """)

    async def insert_into_table(self, userId: int):
        async with pool.acquire() as conn:
            await conn.execute(""" INSERT INTO orders (userId, productIds, total_price , status) 
                               SELECT $1, ARRAY_AGG(basket.marketPosId), SUM(basket.user_count_pos * marketPos.price), $2
                               FROM basket JOIN marketPos ON basket.marketPosId = marketPos.id 
                               WHERE basket.userId = $1""", userId, "execute")

            await conn.execute(""" UPDATE marketPos SET cur_count_pos = cur_count_pos - basket.user_count_pos FROM basket 
                               WHERE basket.userId = $1 AND marketPos.id = basket.marketPosId """, userId)

            await conn.execute(""" DELETE FROM basket WHERE userId = $1  """, userId)

    async def get_data(self):
        async with pool.acquire() as conn:
            res = await conn.fetch(""" SELECT * FROM orders  """)
            return res

    async def get_user_orders(self, userId: int):
        async with pool.acquire() as conn:
            res = await conn.fetch(""" SELECT * FROM orders WHERE userId = $1 """, userId)
            return res

    # async def sort_by_date(self):
    #     async with pool.acquire() as conn:
    #         res = await conn.fetch(""" SELECT * FROM orders ORDER BY date_order """)
    #         return res

    # async def sort_by_price(self):
    #     async with pool.acquire() as conn:
    #         res = await conn.fetch(""" SELECT * FROM orders ORDER BY total_price  """)

user_table = TableUsers()
marketpos_table = TableMarketPosition()
basket_table = TableBasket()        
order_table = TableOrders()
admin_table = TableAdmins()
