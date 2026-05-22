-- Item da Débora: saída direta de estoque pra obra.
-- Diferente da requisição (que tem o fluxo pedir→atender), aqui é baixa direta:
-- "esse material/EPI está indo pra obra X agora", baixa do estoque + custo no
-- centro de custo da obra, em um passo.
--
-- Parte 1 (isolada — novo enum value não pode ser usado na mesma transação):

alter type item_movimentacao_tipo add value if not exists 'saida_obra';
