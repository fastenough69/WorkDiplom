import asyncpg
import asyncio
from decimal import Decimal
import dotenv
import os
import abc

pool = None
config = {"user": "admin", "password": "856901", "database":"AppMarketAutodetails", "host": "db"}

class Table(abc.ABC):
    def __init__(self, name_table: str):
        self.nametable = name_table
        
    async def connect(self):
        global pool
        pool = await asyncpg.create_pool(**config)

    async def create_table(self):
        ...

    async def insert_into_table(self):
        ...

    async def get_data(self):
        ...

    async def _destroy_conn(self):
        await pool.close()

class TableUsers(Table):
    def __init__(self, name_table: str="Users"):
        super().__init__(name_table)

    async def create_table(self):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS users ( id SERIAL PRIMARY KEY, name TEXT, balance numeric, password bytea, admins boolean ) """)
        await  self._destroy_conn()

    async def insert_into_table(self, name: str, balance: Decimal, passwd: bytes, admin: bool):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" INSERT INTO users (name, balance, password, admins) VALUES($1, $2, $3, $4) """, name, balance, passwd, admin)
        await self._destroy_conn()

    async def get_data(self) -> dict:
        await self.connect()
        async with pool.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT (id, name, balance) FROM users """)]
            await self._destroy_conn()
            return dicts

    async def is_admin(self, id) -> bool:
        await self.connect()
        async with pool.acquire() as conn:
            result = await conn.fetchval(""" SELECT (admins) FROM users WHERE id = $1  """, id)
            await self._destroy_conn()
            return {"admin"}


# class TableAdmins(Table):
#     def __init__(self, name_table: str="Admins"):
#         super().__init__(name_table)

#     async def create_table(self):
#         await self.connect()
#         async with pool.acquire() as conn:
#             await conn.execute(""" CREATE TABLE IF NOT EXISTS  """)
        
class TableBasket(Table):
    def __init__(self, name_table: str="Basket"):
        super().__init__(name_table)

    async def create_table(self):
        await self.connect()
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS basket (id SERIAL PRIMARY KEY, userId NOT NULL REFERENCES users(id)) """)

        
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
            await conn.execute() #вот это дописать

class TableOrders:
    def __init__(self):
        pass

user_table = TableUsers()
        
