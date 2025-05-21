import asyncpg
import asyncio
from decimal import Decimal
import dotenv
import os
import abc

pool = None
config = {"user": "admin", "password": "856901", "database":"AppMarketAutodetails", "host": "db"}

class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        config = {"user": "admin", "password": "856901", "database":"AppMarketAutodetails", "host": "db"}
        self.pool = await asyncpg.create_pool(**config)

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
    def __init__(self, name_table):
        super().__init__(name_table)

    async def create_table(self):
        # db = Database()
        # await db.connect()
        # self.__conn = db.pool
        await super().connect()
        async with pool.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS users ( id SERIAL PRIMARY KEY, name TEXT, balance numeric, password bytea ) """)

    async def insert_into_table(self, name: str ,balance: Decimal, passwd: bytes):
        async with self.__conn.acquire() as conn:
            await conn.execute(""" INSERT INTO users (name, balance, password) VALUES($1, $2, $3) """, name, balance, passwd)

    async def get_data(self) -> dict:
        async with self.__conn.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT (id, name, balance) FROM users """)]
            return dicts

    def __del__(self):
        pass
        
class TableBasket:
    def __init__(self):
        pass

class TableMarketPosition:
    def __init__(self):
        pass

class TableOrders:
    def __init__(self):
        pass

user_table = TableUsers()
        
