document.addEventListener('DOMContentLoaded', () => {
    // --- Referências aos Elementos HTML ---
    const consumoMensalInput = document.getElementById('consumoMensal');
    const valorKwhInput = document.getElementById('valorKwh');
    const custoDisponibilidadeInput = document.getElementById('custoDisponibilidade');
    const localizacaoSelect = document.getElementById('localizacao');
    const hspInputGroup = document.getElementById('hspInputGroup');
    const hspManualInput = document.getElementById('hspManual');
    const potenciaDesejadaInput = document.getElementById('potenciaDesejada');
    
    // Elementos para escolha do modo de custo
    const modeKwPRadio = document.getElementById('modeKwP');
    const modeTotalRadio = document.getElementById('modeTotal');
    const inputCustoKwPDiv = document.getElementById('inputCustoKwP');
    const inputValorTotalProjetoDiv = document.getElementById('inputValorTotalProjeto');

    const custoKwPInput = document.getElementById('custoKwP');
    const valorTotalProjetoInput = document.getElementById('valorTotalProjeto');

    const fatorPerdasInput = document.getElementById('fatorPerdas');
    
    // Elementos para escolha da forma de pagamento
    const modeFinancedRadio = document.getElementById('modeFinanced');
    const modeCashRadio = document.getElementById('modeCash');
    const financiamentoInputsDiv = document.getElementById('financiamentoInputs'); // O div que contém taxaJuros e prazoFinanciamento

    const taxaJurosInput = document.getElementById('taxaJuros');
    const prazoFinanciamentoInput = document.getElementById('prazoFinanciamento');
    const taxaInflacaoEnergiaInput = document.getElementById('taxaInflacaoEnergia');

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
    const outEconomiaTotalFinanciamento = document.getElementById('outEconomiaTotalFinanciamento');
    const outEconomiaTotalVidaUtil = document.getElementById('outEconomiaTotalVidaUtil');

    // --- Constantes do Sistema Solar ---
    const MODULO_POWER_WP = 570;
    const DIAS_NO_MES = 30.4;
    const VIDA_UTIL_ANOS = 25;
    const DEGRADACAO_ANUAL_PAINEL = 0.005; // 0.5% ao ano

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
        if (monthlyInterestRate === 0 || numberOfPayments === 0) { // Lidar com juros zero ou prazo zero
            return principal / numberOfPayments; // Se prazo zero, retorno infinito. No caso de a vista, essa func não é chamada.
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

    // --- Lógica para alternar campos de custo (R$/kWp vs Valor Total) ---
    const updateCostInputMode = () => {
        if (modeKwPRadio.checked) {
            inputCustoKwPDiv.classList.remove('hidden');
            inputValorTotalProjetoDiv.classList.add('hidden');
        } else {
            inputCustoKwPDiv.classList.add('hidden');
            inputValorTotalProjetoDiv.classList.remove('hidden');
        }
    };

    // --- Lógica para alternar campos de financiamento (Financiado vs À Vista) ---
    const updatePaymentModeDisplay = () => {
        if (modeFinancedRadio.checked) {
            financiamentoInputsDiv.classList.remove('hidden');
        } else {
            financiamentoInputsDiv.classList.add('hidden');
        }
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

    // Event listeners para os radio buttons de modo de custo
    modeKwPRadio.addEventListener('change', updateCostInputMode);
    modeTotalRadio.addEventListener('change', updateCostInputMode);

    // Event listeners para os radio buttons de forma de pagamento
    modeFinancedRadio.addEventListener('change', updatePaymentModeDisplay);
    modeCashRadio.addEventListener('change', updatePaymentModeDisplay);

    // Adiciona o evento de click ao botão de calcular
    calcularBtn.addEventListener('click', calcularEconomia);

    // Chamadas iniciais para definir os modos ao carregar a página
    updateCostInputMode();
    updatePaymentModeDisplay();

    // --- Função Principal de Cálculo ---
    function calcularEconomia() {
        // Esconde mensagens de erro e resultados anteriores
        errorMessageDiv.classList.add('hidden');
        resultadosDiv.classList.add('hidden');
        errorTextSpan.textContent = '';

        // 1. Coletar e Validar Inputs
        // Substitui vírgula por ponto para garantir que parseFloat funcione corretamente
        const consumoMensal = parseFloat(consumoMensalInput.value.replace(',', '.'));
        const valorKwh = parseFloat(valorKwhInput.value.replace(',', '.'));
        const custoDisponibilidade = parseFloat(custoDisponibilidadeInput.value.replace(',', '.'));
        const localizacao = localizacaoSelect.value;
        const hspManual = hspManualInput.value.replace(',', '.');
        const potenciaDesejadaPercent = parseFloat(potenciaDesejadaInput.value.replace(',', '.'));
        
        // Coleta o custo com base no modo selecionado (R$/kWp ou Valor Total)
        let custoKwP = 0;
        let valorTotalInvestimento = 0;
        
        if (modeKwPRadio.checked) {
            custoKwP = parseFloat(custoKwPInput.value.replace(',', '.'));
            if (isNaN(custoKwP) || custoKwP <= 0) {
                errorMessageDiv.classList.remove('hidden');
                errorTextSpan.textContent = 'Por favor, preencha o Custo de Instalação (R$/kWp) com um valor válido.';
                return;
            }
        } else { // modeTotalRadio.checked
            valorTotalInvestimento = parseFloat(valorTotalProjetoInput.value.replace(',', '.'));
            if (isNaN(valorTotalInvestimento) || valorTotalInvestimento <= 0) {
                errorMessageDiv.classList.remove('hidden');
                errorTextSpan.textContent = 'Por favor, preencha o Valor Total do Projeto com um valor válido.';
                return;
            }
        }

        const fatorPerdasPercent = parseFloat(fatorPerdasInput.value.replace(',', '.'));
        const taxaInflacaoEnergiaAnual = parseFloat(taxaInflacaoEnergiaInput.value.replace(',', '.'));

        // Coleta os dados de financiamento se o modo for "Financiado"
        const isFinanced = modeFinancedRadio.checked;
        let taxaJurosMensal = 0;
        let prazoFinanciamento = 0;

        if (isFinanced) {
            taxaJurosMensal = parseFloat(taxaJurosInput.value.replace(',', '.'));
            prazoFinanciamento = parseInt(prazoFinanciamentoInput.value.replace(',', '.'));
            
            // Validação de campos de financiamento
            if (isNaN(taxaJurosMensal) || taxaJurosMensal < 0 ||
                isNaN(prazoFinanciamento) || prazoFinanciamento <= 0) {
                errorMessageDiv.classList.remove('hidden');
                errorTextSpan.textContent = 'Por favor, preencha os dados do financiamento com valores válidos.';
                return;
            }
        }


        // Validação básica de outros campos
        if (isNaN(consumoMensal) || consumoMensal <= 0 ||
            isNaN(valorKwh) || valorKwh <= 0 ||
            isNaN(custoDisponibilidade) || custoDisponibilidade < 0 ||
            isNaN(potenciaDesejadaPercent) || potenciaDesejadaPercent <= 0 || potenciaDesejadaPercent > 100 ||
            isNaN(fatorPerdasPercent) || fatorPerdasPercent < 0 || fatorPerdasPercent >= 100 ||
            isNaN(taxaInflacaoEnergiaAnual) || taxaInflacaoEnergiaAnual < 0) {
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
        const fatorPerdasDecimal = (100 - fatorPerdasPercent) / 100;
        const potenciaDesejadaDecimal = potenciaDesejadaPercent / 100;
        const taxaInflacaoEnergiaMensal = Math.pow(1 + (taxaInflacaoEnergiaAnual / 100), 1/12) - 1;
        const taxaDegradacaoMensal = Math.pow(1 - DEGRADACAO_ANUAL_PAINEL, 1/12) - 1;

        // 2. Cálculos da Usina Solar
        const consumoMensalParaUsina = consumoMensal * potenciaDesejadaDecimal;
        const potenciaNecessariaKwP = consumoMensalParaUsina / (hsp * DIAS_NO_MES * fatorPerdasDecimal);

        const numModulos = Math.ceil(potenciaNecessariaKwP * 1000 / MODULO_POWER_WP);

        const geracaoMensalKwhInicial = (numModulos * MODULO_POWER_WP / 1000) * hsp * DIAS_NO_MES * fatorPerdasDecimal;

        // Se o modo de custo for R$/kWp, calcula o valor total do investimento a partir dele
        if (modeKwPRadio.checked) {
            valorTotalInvestimento = potenciaNecessariaKwP * custoKwP;
        } 
        // Se o modo for Valor Total do Projeto, o valorTotalInvestimento já foi coletado.

        // 3. Cálculos Financeiros
        let parcelaFinanciamento = 0;
        if (isFinanced) {
            parcelaFinanciamento = calculatePMT(valorTotalInvestimento, taxaJurosMensal, prazoFinanciamento);
        }
        
        const contaAtualEstimada = (consumoMensal * valorKwh) + custoDisponibilidade;

        let consumoDaRedeMes1 = consumoMensal - geracaoMensalKwhInicial;
        let novaContaLuzEstimadaMes1;
        if (consumoDaRedeMes1 <= 0) {
            novaContaLuzEstimadaMes1 = custoDisponibilidade;
        } else {
            novaContaLuzEstimadaMes1 = (consumoDaRedeMes1 * valorKwh) + custoDisponibilidade;
        }

        const gastoTotalPosSolarMes1 = novaContaLuzEstimadaMes1 + parcelaFinanciamento;

        const economiaImediata = contaAtualEstimada - gastoTotalPosSolarMes1;

        const percentualEconomia = (economiaImediata / contaAtualEstimada);


        // 4. Projeção de Economia Total
        let economiaTotalFinanciamentoPeriodo = 0; // Usar essa variável para o total durante o período de financiamento
        let economiaTotalVidaUtil = 0;

        let valorKwhProjecao = valorKwh;
        let geracaoMensalKwhProjecao = geracaoMensalKwhInicial;
        let custoDisponibilidadeProjecao = custoDisponibilidade;

        for (let mes = 1; mes <= VIDA_UTIL_ANOS * 12; mes++) {
            const contaSemSolarNoMes = (consumoMensal * valorKwhProjecao) + custoDisponibilidadeProjecao;

            let consumoDaRedeNoMes = consumoMensal - geracaoMensalKwhProjecao;
            
            let novaContaLuzNoMes;
            if (consumoDaRedeNoMes <= 0) {
                novaContaLuzNoMes = custoDisponibilidadeProjecao;
            } else {
                novaContaLuzNoMes = (consumoDaRedeNoMes * valorKwhProjecao) + custoDisponibilidadeProjecao;
            }

            const parcelaNoMes = (isFinanced && mes <= prazoFinanciamento) ? parcelaFinanciamento : 0;

            const gastoComSolarNoMes = novaContaLuzNoMes + parcelaNoMes;

            const economiaNoMes = contaSemSolarNoMes - gastoComSolarNoMes;

            if (mes <= prazoFinanciamento) { // Acumula economia durante o período que o financiamento duraria (ou é à vista)
                economiaTotalFinanciamentoPeriodo += economiaNoMes;
            }
            economiaTotalVidaUtil += economiaNoMes;

            // Atualizar valores para o próximo mês (inflação e degradação)
            valorKwhProjecao *= (1 + taxaInflacaoEnergiaMensal);
            custoDisponibilidadeProjecao *= (1 + taxaInflacaoEnergiaMensal);
            geracaoMensalKwhProjecao *= (1 + taxaDegradacaoMensal);
        }


        // 5. Exibir Resultados
        outPotenciaUsina.textContent = `${potenciaNecessariaKwP.toFixed(2)} kWp`;
        outNumModulos.textContent = `${numModulos} módulos`;
        outGeracaoMensal.textContent = `${geracaoMensalKwhInicial.toFixed(0)} kWh/mês`;
        outValorInvestimento.textContent = formatCurrency(valorTotalInvestimento);
        outContaAtual.textContent = formatCurrency(contaAtualEstimada);
        
        // Exibe "À Vista" ou a parcela
        outParcelaFinanciamento.textContent = isFinanced ? formatCurrency(parcelaFinanciamento) : 'À Vista'; 

        outNovaContaLuz.textContent = formatCurrency(novaContaLuzEstimadaMes1);
        outGastoTotal.textContent = formatCurrency(gastoTotalPosSolarMes1);
        outEconomiaImediata.textContent = formatCurrency(economiaImediata);
        outPercentualEconomia.textContent = formatPercentage(percentualEconomia);
        
        // Exibe economia total do período de financiamento (mesmo se for à vista, é o período de comparação)
        outEconomiaTotalFinanciamento.textContent = formatCurrency(economiaTotalFinanciamentoPeriodo); 
        outEconomiaTotalVidaUtil.textContent = formatCurrency(economiaTotalVidaUtil);

        resultadosDiv.classList.remove('hidden');
    }
});