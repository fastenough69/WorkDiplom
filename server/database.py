import asyncpg
import asyncio
from decimal import Decimal
import dotenv
import os
import abc
import bcrypt

pool = None

class Table(abc.ABC):
    def __init__(self, name_table: str):
        self.nametable = name_table

    async def connect(self):
        global pool
        config = {"user": "admin", "password": "856901", "database":"AppMarketAutodetails", "host": "db"}
        pool = await asyncpg.create_pool(**config)

    async def create_table(self):
        ...

    async def insert_into_table(self):
        ...

    async def get_data(self):
        ...

    async def deleted_row(self):
        ...

    async def _destroy_conn(self):
        await pool.close()

class TableUsers(Table):
    def __init__(self, name_table: str="Users"):
        super().__init__(name_table)

    async def create_table(self):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS users ( id SERIAL PRIMARY KEY, phone TEXT, balance numeric, password bytea, admins boolean ) """)
        await  self._destroy_conn()

    async def insert_into_table(self, number: str, balance: Decimal, passwd: bytes, admin: bool):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" INSERT INTO users (phone, balance, password, admins) VALUES($1, $2, $3, $4) """, number, balance, passwd, admin)
        await self._destroy_conn()

    async def get_id_user(self, phone: str):
        await self.connect()
        async with pool.acquire() as conn:
            _id = await conn.fetchval(""" SELECT id FROM users WHERE phone = $1 """, phone)
            if(phone):
                return _id
            return False

    async def get_data(self) -> dict:
        await self.connect()
        async with pool.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT (id, name, balance) FROM users """)]
            await self._destroy_conn()
            return dicts

    async def check_user(self, phone: str, passwd: str) -> bool:
        result = False
        await self.connect()
        async with pool.acquire() as conn:
            res = await conn.fetchrow(""" SELECT phone, password FROM users WHERE phone = $1 """, phone)
            passwd = passwd.encode("utf-8")
            if(bcrypt.checkpw(passwd, res["password"])):
                result = True
            return result

    async def is_admin(self, id) -> bool:
        await self.connect()
        async with pool.acquire() as conn:
            result = await conn.fetchval(""" SELECT (admins) FROM users WHERE id = $1  """, id)
            return {"admin"}

class TableBasket(Table):
    def __init__(self, name_table: str="basket"):
        super().__init__(name_table)

    async def create_table(self):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS basket (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(id),
    marketPosId INTEGER NOT NULL REFERENCES marketPos(id),
    user_count_pos INTEGER DEFAULT 1,
    UNIQUE(userId, marketPosId)
)  """)

    async def get_data(self) -> dict:
        await self.connect()
        async with pool.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT basket.user_count_pos, marketPos.product_name FROM basket JOIN marketPos ON marketPos.id = basket.id JOIN users ON users.id=basket.userId  """)]
        return dicts

    async def get_basket_user(self, userId: int):
        await self.connect()
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
        await self.connect()
        async with pool.acquire() as conn:
            try:
                await conn.execute(""" INSERT INTO basket (userId, marketPosId, user_count_pos) VALUES ($1, (SELECT id FROM marketPos WHERE product_name = $2 LIMIT 1), $3) """, userId, product_name, cur_count)
            except:
                res["status"] = False
            return res

    async def deleted_row(self, product_name: str, userId: int):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" DELETE FROM basket WHERE marketPosId IN (SELECT id FROM marketPos WHERE product_name = $1)
                               AND WHERE basket.userId = $2""", product_name, userId)

class TableMarketPosition(Table):
    def __init__(self, name_table: str="marketPos"):
        super().__init__(name_table)

    async def create_table(self):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS marketPos (id SERIAL PRIMARY KEY, product_name TEXT, cur_count_pos INTEGER, price numeric) """)

    async def insert_into_table(self, product_name: str, count_pos: int, price: Decimal):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" INSERT INTO marketPos (product_name, cur_count_pos, price) VALUES($1, $2, $3) """, product_name, count_pos, price)

    async def get_data(self) -> dict:
        await self.connect()
        async with pool.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT product_name, cur_count_pos, price FROM marketPos  """)]
            return dicts


    async def deleted_row(self, product_name_del: str):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" DELETE FROM marketPos WHERE product_name = $1  """, product_name_del)

class TableOrders(Table):
    def __init__(self, name_table: str="orders"):
        super().__init__(name_table)

    async def create_table(self):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute("""
                    CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY, 
                    userId INTEGER NOT NULL REFERENCES users(id),
                    basketId INTEGER NOT NULL REFERENCES basket(id),
                    status TEXT
                    )
                """)

    async def insert_into_table(self, userId: int):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" INSERT INTO orders (userId, basketId, status) VALUES($1, (SELECT id FROM basket WHERE basket.userId=$1 LIMIT 1), $2) """, userId, "peding")

user_table = TableUsers()
marketpos_table = TableMarketPosition()
basket_table = TableBasket()        
order_table = TableOrders()
