import asyncpg
import asyncio
from decimal import Decimal

class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        config = {"user": "postgres", "password": "856901RFv", "database":"AppMarketAutodetails", "host": "localhost"}
        self.pool = await asyncpg.create_pool(**config)

class TableUsers:
    def __init__(self, conn: asyncpg.Pool):
        self.nametable = "Users"
        self.__conn = conn

    async def create_table(self):
        async with self.__conn.acquire() as conn:
            await conn.execute(""" CREATE TABLE IF NOT EXISTS users ( id SERIAL PRIMARY KEY, name TEXT, balance numeric, password bytea ) """)

    async def insert_into_table(self, name: str ,balance: Decimal, passwd: bytes):
        async with self.__conn.acquire() as conn:
            await conn.execute(""" INSERT INTO users (name, balance, password) VALUES($1, $2, $3) """, name, balance, passwd)

    async def get_data(self) -> dict:
        async with self.__conn.acquire() as conn:
            dicts = [dict(row) for row in await conn.fetch(""" SELECT (name, balance) FROM users """)]
            return dicts
        
class TableBasket:
    def __init__(self):
        pass

class TableMarketPosition:
    def __init__(self):
        pass

class TableOrders:
    def __init__(self):
        pass

db = Database().connect()
        