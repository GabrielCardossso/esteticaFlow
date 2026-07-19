(function () {
    'use strict';

    var SUPPORTED_TYPES = new Set(['cpfcnpj', 'documento', 'cnpj', 'telefone', 'cep', 'placa', 'uf']);
    var IGNORED_INPUT_TYPES = new Set(['number', 'date', 'datetime-local']);

    function digits(value, limit) {
        return value.replace(/\D/g, '').slice(0, limit);
    }

    function formatCpf(value) {
        var raw = digits(value, 11);
        return raw
            .replace(/^(\d{3})(\d)/, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2');
    }

    function formatCnpj(value) {
        var raw = digits(value, 14);
        return raw
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }

    function formatDocument(value) {
        return digits(value, 14).length <= 11 ? formatCpf(value) : formatCnpj(value);
    }

    function formatPhone(value) {
        var raw = digits(value, 11);
        if (raw.length <= 2) {
            return raw.length ? '(' + raw : '';
        }
        var prefix = '(' + raw.slice(0, 2) + ') ';
        var body = raw.slice(2);
        var split = raw.length > 10 ? 5 : 4;
        return prefix + body.slice(0, split) + (body.length > split ? '-' + body.slice(split) : '');
    }

    function formatCep(value) {
        var raw = digits(value, 8);
        return raw.length > 5 ? raw.slice(0, 5) + '-' + raw.slice(5) : raw;
    }

    function formatPlate(value) {
        var raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
        if (raw.length > 3 && /^[A-Z]{3}\d{1,4}$/.test(raw)) {
            return raw.slice(0, 3) + '-' + raw.slice(3);
        }
        return raw;
    }

    function formatUf(value) {
        return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    }

    var formatters = {
        cpfcnpj: formatDocument,
        documento: formatDocument,
        cnpj: formatCnpj,
        telefone: formatPhone,
        cep: formatCep,
        placa: formatPlate,
        uf: formatUf
    };

    var maximumLengths = {
        cpfcnpj: 18,
        documento: 18,
        cnpj: 18,
        telefone: 15,
        cep: 9,
        placa: 8,
        uf: 2
    };

    function maskType(input) {
        var explicit = (input.dataset.mask || '').toLowerCase().replace(/[-_]/g, '');
        if (SUPPORTED_TYPES.has(explicit)) {
            return explicit;
        }
        var inferred = (input.name || input.id || '').toLowerCase().replace(/[-_]/g, '');
        return SUPPORTED_TYPES.has(inferred) ? inferred : null;
    }

    function rawLength(type, value) {
        return type === 'placa' || type === 'uf'
            ? value.replace(/[^A-Za-z0-9]/g, '').length
            : value.replace(/\D/g, '').length;
    }

    function caretForRawLength(type, value, length) {
        if (length === 0) {
            return 0;
        }
        for (var index = 1; index <= value.length; index += 1) {
            if (rawLength(type, value.slice(0, index)) >= length) {
                return index;
            }
        }
        return value.length;
    }

    function applyMask(input, type, preserveCaret) {
        var selectionStart = input.selectionStart;
        var significantBeforeCaret = selectionStart == null ? null : rawLength(type, input.value.slice(0, selectionStart));
        var formatted = formatters[type](input.value);
        if (input.value !== formatted) {
            input.value = formatted;
        }
        if (preserveCaret && significantBeforeCaret != null && document.activeElement === input) {
            var caret = caretForRawLength(type, formatted, significantBeforeCaret);
            input.setSelectionRange(caret, caret);
        }
    }

    function initialize(input) {
        if (!(input instanceof HTMLInputElement) || IGNORED_INPUT_TYPES.has(input.type)) {
            return;
        }
        var type = maskType(input);
        if (!type) {
            return;
        }
        input.maxLength = maximumLengths[type];
        if (!input.inputMode) {
            input.inputMode = type === 'placa' || type === 'uf' ? 'text' : 'numeric';
        }
        applyMask(input, type, false);
        input.addEventListener('input', function () {
            applyMask(input, type, true);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('input').forEach(initialize);
    });
}());
