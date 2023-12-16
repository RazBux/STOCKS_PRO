const axios = require('axios');
const cheerio = require('cheerio');
const webUrl = ''

axios.get(webUrl).then((response) => {
    if (response.status === 200) {
        console.log("respons = 200")
        const html = response.data;
        console.log(html)
        const $ = cheerio.load(html);
  
        // Replace 'table' with a more specific selector if needed
        const tables = $('table');
  
        tables.each((index, table) => {
            const rows = $(table).find('tr');
  
            rows.each((rowIndex, row) => {
            const columns = $(row).find('td');
  
                columns.each((columnIndex, column) => {
                    // Process your table data here, e.g., extract text content
                    const cellData = $(column).text();
                    console.log(cellData);
                });
            });
        });
    }
});  
  
  
  
  