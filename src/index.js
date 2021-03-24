const { request, response } = require("express");
const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers= [];

// Middleware - Conceito de uma function que fica entre request e o response
function verifyIfExistAccountCpf(request,response,next) {
  const { cpf } = request.headers;

  const customer = customers.find(customer => customer.cpf === cpf);

  if(!customer) {
    return response.status(400).json({
      error: "Customer not found!"
    });  
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc,operation) =>{
    if(operation.type === 'credit') {
      return acc + operation.amount;
    }else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

app.post("/account",(request,response)=>{
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if(customerAlreadyExists){
    return response.status(400).json({
      error: "Customer already exists!"

    });
  }

  customers.push({
    cpf,
    name,
    id:  uuidv4(),
    fund: 0,
    statement: [],
  });

  return response.status(201).send();

});

app.get("/statement",verifyIfExistAccountCpf,(request,response)=>{
  const { customer } = request;
  return response.json(customer.statement);
});

app.get("/account",verifyIfExistAccountCpf,(request,response)=>{
  const { customer } = request;
  return response.json(customer);
});

app.post("/deposit",verifyIfExistAccountCpf,(request,response)=>{
  const { amount, description } = request.body;
  const { customer } = request;
  
  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit"
  }

  customer.statement.push(statementOperation);

  const balance = getBalance(customer.statement);

  customer.fund = balance;

  return response.status(201).send();

});

app.post("/withdraw",verifyIfExistAccountCpf,(request,response)=>{
  const { amount } = request.body;

  const { customer } = request;

  const balance = getBalance(customer.statement);

  if(balance < amount) {
    return response.status(400).json({error: "Insufficiente funds!"});
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit"
  }

  customer.statement.push(statementOperation);

  customer.fund = getBalance(customer.statement);

  return response.status(201).send();

});

app.listen(3333);