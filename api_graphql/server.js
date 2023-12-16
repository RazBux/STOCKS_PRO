//to start the code type in terminal >>>> npm run devStart
//to kill the prosess id - find it with "lsof -i :8000" and kill it with "kill -9 <PID>"
const express = require('express');
const { graphqlHTTP } = require('express-graphql'); // Use graphqlHTTP for middleware
const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLInt,
    GraphQLFloat
} = require('graphql');

const sqlite3 = require('sqlite3').verbose(); // Import the sqlite3 package
const db = new sqlite3.Database('/Users/razbuxboim/Desktop/pyPro/docs/db/TSLA.db');

const app = express();
const PORT = process.env.PORT || 8000;

const revenueByQuarter = new GraphQLObjectType({
    name: 'GetRevene',
    description: 'Get revene by quarter',
    fields: () => ({
        //those name need to be as in the query!
        quarter: {type: GraphQLFloat},
        total_revenues: {type: GraphQLString}
    })
});

const RootQueryType = new GraphQLObjectType({
    name: 'RootQuery',
    description: 'Root Query - collect all the query for db.',
    fields: () => ({
        revenue: {
            type: new GraphQLList(revenueByQuarter),
            description: 'Get data on total revnue',
            args: {
                // Define the SQL query argument as a GraphQL String
                sqlQuery: { 
                    type: GraphQLString,
                    defaultValue: "SELECT quarter, total_revenues FROM tesla;" //"total_revenue and quarter" need to be same in all tables and databases.
                },
            },
            resolve: async (_, args) => {
                try {
                    // Access the SQL query from the arguments
                    const { sqlQuery } = args;

                    // Execute the query using async/await
                    const rows = await new Promise((resolve, reject) => {
                        db.all(sqlQuery, (err, rows) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                console.log(`Run query: ${sqlQuery}`)
                                console.log(rows)
                                resolve(rows)
                            }
                        });
                    });
                    return rows;
                } catch (error) {
                    // Handle any errors here
                    console.error('Error fetching revenue data:', error.message);
                    throw error;
                }
            }
        }
    })
})

const schemaRev = new GraphQLSchema({
    query: RootQueryType
})

// Use graphqlHTTP middleware to handle GraphQL requests
app.use('/graphql', graphqlHTTP({
    // schema: schema,
    schema: schemaRev,
    graphiql: true
}));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Close the database connection when the process is terminated (SIGINT)
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing the database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(); // Exit the process after closing the database connection
    });
});