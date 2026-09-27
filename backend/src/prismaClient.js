// One shared database connection, reused across the whole app.
// Every route file imports THIS instead of creating its own connection.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
