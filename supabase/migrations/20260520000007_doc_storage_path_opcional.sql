-- Permite registrar um curso/NR só com as datas (realização + validade),
-- sem precisar anexar o arquivo do certificado. O storage_path passa a ser
-- opcional — quando há arquivo, fica preenchido; quando é só registro de
-- data, fica nulo.

alter table funcionario_documentos
  alter column storage_path drop not null;
