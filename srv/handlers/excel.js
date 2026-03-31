const exceljs = require('exceljs');

const excelProductTemplate = async (req) => {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Layout');

    worksheet.columns = [ { header: 'name', key: 'name', width: 45 },
                          { header: 'description', key: 'description', width: 45 },
                          { header: 'price', key: 'price', width: 20 },
                          { header: 'stock', key: 'stock', width: 20 },
                          { header: 'stock_min', key: 'stock_min', width: 20 } ];
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    req._.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    req._.res.setHeader('Content-Disposition', 'attachment; filename="Template.xlsx"');
    req._.res.send(buffer);
};

module.exports = { excelProductTemplate };
