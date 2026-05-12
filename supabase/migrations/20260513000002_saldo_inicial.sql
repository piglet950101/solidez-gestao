-- Saldo inicial por obra (opening balance na data do go-live)
alter table obras
  add column if not exists saldo_inicial numeric(14,2),
  add column if not exists saldo_inicial_data date;
