import cds from '@sap/cds/eslint.config.mjs'

export default [
    ...cds.recommended,
    {
        ignores: [
            'node_modules/',
            'gen/',
            'app/router/',
            'app/cap_try/webapp/util/',
            'app/cap_try/webapp/test/'
        ]
    },
    {
        files: ['app/**/*.js'],
        languageOptions: {
            globals: {
                XLSX: 'readonly',
                sap: 'readonly',
                FileReader: 'readonly'
            }
        }
    },
    {
        files: ['srv/handlers/jobs.js'],
        rules: {
            'no-console': 'off'
        }
    }
]
