const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
} = require('graphql');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/Users/razbuxboim/Desktop/pyPro/docs/db/TSLA.db');

const app = express();
const PORT = process.env.PORT || 8000;

const revenueByQuarter = new GraphQLObjectType({
    name: 'GetRevene',
    description: 'Get revenue by quarter',
    fields: () => ({
        quarter: { type: GraphQLString },
        total_revenues: { type: GraphQLString }
    })
});

const getTableNames = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const tableNames = rows.map(row => row.name);
                resolve(tableNames);
            }
        });
    });
};

const buildTableQueryType = (tableNames) => {
    const fields = {};

    tableNames.forEach((tableName) => {
        fields[tableName] = {
            type: new GraphQLList(revenueByQuarter),
            args: {
                columns: { type: GraphQLList(GraphQLNonNull(GraphQLString)) },
            },
            resolve: async (_, args) => {
                try {
                    const { columns } = args;
                    const sqlColumns = columns.join(', ');
                    const sqlQuery = `SELECT ${sqlColumns} FROM ${tableName};`;

                    const rows = await new Promise((resolve, reject) => {
                        db.all(sqlQuery, (err, rows) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log(`Run query: ${sqlQuery}`);
                                console.log(rows);
                                resolve(rows);
                            }
                        });
                    });

                    return rows;
                } catch (error) {
                    console.error(`Error fetching data from ${tableName}:`, error.message);
                    throw error;
                }
            },
        };

        // Add a new field to fetch column names
        fields[`${tableName}_columns`] = {
            type: new GraphQLList(GraphQLString),
            resolve: async () => {
                try {
                    // Fetch column names for the specified table
                    const columnsQuery = `PRAGMA table_info(${tableName});`;
                    const columnsInfo = await new Promise((resolve, reject) => {
                        db.all(columnsQuery, (err, rows) => {
                            if (err) {
                                reject(err);
                            } else {
                                const columns = rows.map(row => row.name);
                                resolve(columns);
                            }
                        });
                    });

                    return columnsInfo;
                } catch (error) {
                    console.error(`Error fetching column names for ${tableName}:`, error.message);
                    throw error;
                }
            },
        };
    });

    return fields;
};

const buildRootQueryFields = (tableNames, dynamicObjectType) => ({
    tables: {
        type: new GraphQLList(GraphQLString),
        resolve: () => tableNames,
    },
    ...dynamicObjectType,
});

const createGraphQLSchema = async () => {
    const tableNames = await getTableNames();
    const dynamicObjectType = buildTableQueryType(tableNames);

    const rootQueryFields = buildRootQueryFields(tableNames, dynamicObjectType);

    return new GraphQLSchema({
        query: new GraphQLObjectType({
            name: 'RootQuery',
            fields: () => rootQueryFields,
        }),
    });
};

app.use('/graphql', graphqlHTTP(async (req) => {
    const schema = await createGraphQLSchema();
    return {
        schema,
        graphiql: true,
    };
}));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing the database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit();
    });
});
