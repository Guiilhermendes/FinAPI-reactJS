const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(express.json());

let customers = [];

// Middleware
function verifyIfExistsAccountNationalId(request, response, next) {
    const { nationalid } = request.headers;
    const customer = customers.find(el => el.nationalId === nationalid)
    if (!customer) return response.status(404).json({ error: 'Customer not found!' });
    request.customer = customer;
    return next();
}

function getBalance(statement) {
    return statement.reduce((acc, operation) => {
        const value = operation.type === "credit" ? operation.amount : -operation.amount
        return acc + value
    }, 0);
}

app.post('/account', (req, res) => {
    let { nationalId, name } = req.body;
    const customerAlreadyExists = customers.some(el => el.nationalId === nationalId);
    if (customerAlreadyExists) return res.status(400).json({ error: 'Customer already exists!' });

    customers = [...customers, {
        id: uuidv4(),
        nationalId,
        name,
        statement: []
    }];

    return res.status(201).send("Okay, account has been created");
});

// app.use(verifyIfExistsAccountNationalId);

app.get('/statement', verifyIfExistsAccountNationalId, (req, res) => {
    const { customer } = req;
    return res.json(customer.statement)
});

app.post('/deposit', verifyIfExistsAccountNationalId, (req, res) => {
    const { description, amount } = req.body;
    const { customer } = req;
    const statementOperation = {
        description,
        amount,
        createdAt: new Date(),
        type: 'credit'
    };
    customer.statement.push(statementOperation);

    return res.status(201).send("The deposit was successful")
});

app.post('/withdraw', verifyIfExistsAccountNationalId, (req, res) => {
    const { amount } = req.body;
    const { customer } = req;
    const balance = getBalance(customer.statement);

    if (balance < amount) return res.status(400).json({ error: 'Insufficient account balance!' });

    const statementOperation = {
        amount,
        createdAt: new Date(),
        type: 'debit'
    };
    customer.statement.push(statementOperation);

    return res.status(201).send("The withdraw was successful")
});

app.get('/statement/date', verifyIfExistsAccountNationalId, (req, res) => {
    const { customer } = req;
    const { date } = req.query;
    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(statement => statement.createdAt.toDateString() === new Date(dateFormat).toDateString())
    return res.json(statement)
});

app.put('/account', verifyIfExistsAccountNationalId, (req, res) => {
    const { name } = req.body;
    const { customer } = req;

    customer.name = name;

    return res.status(201).send("User updated successfully")
});

app.get('/account', verifyIfExistsAccountNationalId, (req, res) => {
    const { customer } = req;
    return res.json(customer);
});

app.delete('/account', verifyIfExistsAccountNationalId, (req, res) => {
    const { customer } = req;
    customers.splice(customer, 1);

    return res.status(200).json(`User ${customer.name} deleted successfully`)
});

app.get('/balance', verifyIfExistsAccountNationalId, (req, res) => {
    const { customer } = req;
    const balance = getBalance(customer.statement);
    return res.json(balance);
})

app.listen(3333);