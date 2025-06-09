document.addEventListener('DOMContentLoaded', () => {
    // --- Referências aos Elementos HTML ---
    const consumoMensalInput = document.getElementById('consumoMensal');
    const valorKwhInput = document.getElementById('valorKwh');
    const custoDisponibilidadeInput = document.getElementById('custoDisponibilidade');
    const localizacaoSelect = document.getElementById('localizacao');
    const hspInputGroup = document.getElementById('hspInputGroup');
    const hspManualInput = document.getElementById('hspManual');
    const potenciaDesejadaInput = document.getElementById('potenciaDesejada');
    const custoKwPInput = document.getElementById('custoKwP');
    const fatorPerdasInput = document.getElementById('fatorPerdas');
    const taxaJurosInput = document.getElementById('taxaJuros');
    const prazoFinanciamentoInput = document.getElementById('prazoFinanciamento');
    const calcularBtn = document.getElementById('calcularBtn');
    const resultadosDiv = document.getElementById('resultados');
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextSpan = document.getElementById('errorText');

    // --- Referências aos Spans de Saída ---
    const outPotenciaUsina = document.getElementById('outPotenciaUsina');
    const outNumModulos = document.getElementById('outNumModulos');
    const outGeracaoMensal = document.getElementById('outGeracaoMensal');
    const outValorInvestimento = document.getElementById('outValorInvestimento');
    const outContaAtual = document.getElementById('outContaAtual');
    const outParcelaFinanciamento = document.getElementById('outParcelaFinanciamento');
    const outNovaContaLuz = document.getElementById('outNovaContaLuz');
    const outGastoTotal = document.getElementById('outGastoTotal');
    const outEconomiaImediata = document.getElementById('outEconomiaImediata');
    const outPercentualEconomia = document.getElementById('outPercentualEconomia');

    // --- Constantes do Sistema Solar ---
    const MODULO_POWER_WP = 570; // Potência do módulo em Watts-pico
    const DIAS_NO_MES = 30.4; // Média de dias no mês

    // --- Dados de HSP por Localização (Horas de Sol Pico/dia) ---
    const hspData = {
        "Curitiba": 4.2,
        "Sao Paulo": 4.5,
        "Belo Horizonte": 4.7,
        "Fortaleza": 5.5
        // Adicione mais cidades e seus respectivos HSPs aqui
    };

    // --- Funções Auxiliares ---

    // Formata um número para moeda BRL
    const formatCurrency = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Formata um número para percentual
    const formatPercentage = (value) => {
        return value.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 });
    };

    // Função para calcular a parcela do financiamento (PMT)
    const calculatePMT = (principal, monthlyInterestRate, numberOfPayments) => {
        if (monthlyInterestRate === 0) { // Lidar com juros zero para evitar divisão por zero
            return principal / numberOfPayments;
        }
        const i = monthlyInterestRate / 100; // Converte para decimal
        const n = numberOfPayments;
        return principal * (i * Math.pow((1 + i), n)) / (Math.pow((1 + i), n) - 1);
    };

    // Obtém o HSP baseado na seleção da cidade ou input manual
    const getHSP = (location, hspManualValue) => {
        if (location === "Outra") {
            return parseFloat(hspManualValue);
        }
        return hspData[location];
    };

    // --- Event Listeners ---

    // Mostra/esconde o campo HSP Manual quando a localização é "Outra"
    localizacaoSelect.addEventListener('change', () => {
        if (localizacaoSelect.value === 'Outra') {
            hspInputGroup.classList.remove('hidden');
        } else {
            hspInputGroup.classList.add('hidden');
        }
    });

    // Adiciona o evento de click ao botão de calcular
    calcularBtn.addEventListener('click', calcularEconomia);

    // Adiciona o evento 'keydown' para cada input numérico
    // Isso é útil para formatar o valor na entrada
    document.querySelectorAll('.numerical-input').forEach(input => {
        input.addEventListener('input', (event) => {
            // Remove qualquer caracter não numérico ou ponto/vírgula extra
            let value = event.target.value.replace(/[^0-9,.]/g, '');
            // Substitui vírgula por ponto para cálculo
            value = value.replace(',', '.');
            event.target.value = value;
        });
    });


    // --- Função Principal de Cálculo ---
    function calcularEconomia() {
        // Esconde mensagens de erro e resultados anteriores
        errorMessageDiv.classList.add('hidden');
        resultadosDiv.classList.add('hidden');
        errorTextSpan.textContent = '';

        // 1. Coletar e Validar Inputs
        const consumoMensal = parseFloat(consumoMensalInput.value);
        const valorKwh = parseFloat(valorKwhInput.value);
        const custoDisponibilidade = parseFloat(custoDisponibilidadeInput.value);
        const localizacao = localizacaoSelect.value;
        const hspManual = hspManualInput.value; // Pega o valor bruto
        const potenciaDesejadaPercent = parseFloat(potenciaDesejadaInput.value);
        const custoKwP = parseFloat(custoKwPInput.value);
        const fatorPerdasPercent = parseFloat(fatorPerdasInput.value);
        const taxaJurosMensal = parseFloat(taxaJurosInput.value);
        const prazoFinanciamento = parseInt(prazoFinanciamentoInput.value);

        // Validação básica
        if (isNaN(consumoMensal) || consumoMensal <= 0 ||
            isNaN(valorKwh) || valorKwh <= 0 ||
            isNaN(custoDisponibilidade) || custoDisponibilidade < 0 || // Pode ser zero, mas não negativo
            isNaN(potenciaDesejadaPercent) || potenciaDesejadaPercent <= 0 || potenciaDesejadaPercent > 100 ||
            isNaN(custoKwP) || custoKwP <= 0 ||
            isNaN(fatorPerdasPercent) || fatorPerdasPercent < 0 || fatorPerdasPercent >= 100 || // Perdas não podem ser 100% ou mais
            isNaN(taxaJurosMensal) || taxaJurosMensal < 0 ||
            isNaN(prazoFinanciamento) || prazoFinanciamento <= 0) {
            errorMessageDiv.classList.remove('hidden');
            errorTextSpan.textContent = 'Por favor, preencha todos os campos com valores válidos e positivos.';
            return;
        }

        // Validação HSP
        let hsp = getHSP(localizacao, hspManual);
        if (isNaN(hsp) || hsp <= 0) {
            errorMessageDiv.classList.remove('hidden');
            errorTextSpan.textContent = 'Por favor, selecione uma localização válida ou insira um valor de HSP manual positivo.';
            return;
        }


        // Converter percentuais para decimais
        const fatorPerdasDecimal = (100 - fatorPerdasPercent) / 100; // Ex: 20% perda = 0.8 de eficiência
        const potenciaDesejadaDecimal = potenciaDesejadaPercent / 100;

        // 2. Cálculos da Usina Solar
        // Consumo Anualizado (para dimensionar kWp)
        const consumoAnualKwh = consumoMensal * 12;

        // Potência da Usina Sugerida (kWp) baseada na porcentagem desejada
        // Ajusta o consumo mensal para a % desejada antes de anualizar
        const consumoAnualizadoParaUsina = (consumoMensal * potenciaDesejadaDecimal) * 12;
        const potenciaNecessariaKwP = consumoAnualizadoParaUsina / (hsp * 365 * fatorPerdasDecimal);

        // Número Estimado de Módulos (com módulos de 570Wp)
        const numModulos = Math.ceil(potenciaNecessariaKwP * 1000 / MODULO_POWER_WP); // kWp para Wp

        // Geração Mensal Estimada real da usina dimensionada (baseada nos módulos inteiros)
        const geracaoMensalKwh = (numModulos * MODULO_POWER_WP / 1000) * hsp * DIAS_NO_MES * fatorPerdasDecimal;

        // Valor Total do Investimento
        const valorTotalInvestimento = potenciaNecessariaKwP * custoKwP;

        // 3. Cálculos Financeiros
        // Parcela Mensal do Financiamento
        const parcelaFinanciamento = calculatePMT(valorTotalInvestimento, taxaJurosMensal, prazoFinanciamento);

        // Conta de Luz Atual (para comparação)
        const contaAtualEstimada = (consumoMensal * valorKwh) + custoDisponibilidade;

        // Nova Conta de Luz Estimada
        let consumoDaRede = consumoMensal - geracaoMensalKwh;
        let novaContaLuzEstimada;
        if (consumoDaRede <= 0) { // Geração maior ou igual ao consumo
            novaContaLuzEstimada = custoDisponibilidade;
        } else { // Geração menor que o consumo, ainda puxa da rede
            novaContaLuzEstimada = (consumoDaRede * valorKwh) + custoDisponibilidade;
        }

        // Gasto Total Mensal Pós-Solar
        const gastoTotalPosSolar = novaContaLuzEstimada + parcelaFinanciamento;

        // Economia Imediata Mensal
        const economiaImediata = contaAtualEstimada - gastoTotalPosSolar;

        // Percentual de Economia Imediata
        const percentualEconomia = (economiaImediata / contaAtualEstimada);


        // 4. Exibir Resultados
        outPotenciaUsina.textContent = `${potenciaNecessariaKwP.toFixed(2)} kWp`;
        outNumModulos.textContent = `${numModulos} módulos`;
        outGeracaoMensal.textContent = `${geracaoMensalKwh.toFixed(0)} kWh/mês`;
        outValorInvestimento.textContent = formatCurrency(valorTotalInvestimento);
        outContaAtual.textContent = formatCurrency(contaAtualEstimada);
        outParcelaFinanciamento.textContent = formatCurrency(parcelaFinanciamento);
        outNovaContaLuz.textContent = formatCurrency(novaContaLuzEstimada);
        outGastoTotal.textContent = formatCurrency(gastoTotalPosSolar);
        outEconomiaImediata.textContent = formatCurrency(economiaImediata);
        outPercentualEconomia.textContent = formatPercentage(percentualEconomia);

        resultadosDiv.classList.remove('hidden'); // Mostra a seção de resultados
    }
});