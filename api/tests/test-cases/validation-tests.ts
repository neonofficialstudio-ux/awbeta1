
// api/tests/test-cases/validation-tests.ts
import type { TestDefinition } from '../test-runner';
import type { Mission } from '../../../types';
// FIX: Renamed 'validateSubmission' to 'validateMissionSubmission' to match the exported function name.
import { validateLink, validateImageUpload, validateMissionSubmission } from '../../quality/validateInputs';

const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

// Mocks for context, though not directly used in the new function signature.
const mockMissionVideo: Mission = { id: 'm-vid', title: '', description: 'formato vídeo', type: 'instagram', createdAt: '', deadline: '', status: 'active', xp: 100, coins: 50 };
const mockMissionFoto: Mission = { id: 'm-foto', title: '', description: 'formato foto', type: 'instagram', createdAt: '', deadline: '', status: 'active', xp: 100, coins: 50 };

const validLink = 'https://instagram.com/p/C-aaaa-aaaa';
const invalidLink = 'instagram.com/p/C-aaaa-aaaa';
const validImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const invalidImage = 'data:text/plain;base64,aGVsbG8=';


export const validationTests: TestDefinition[] = [
    {
        name: 'Validação de links aceita URLs válidas',
        fn: () => {
            const result = validateLink(validLink);
            assert(result.ok, `Expected link to be valid, but got: ${result.reason}`);
        }
    },
    {
        name: 'Validação de links rejeita URLs inválidas',
        fn: () => {
            const result = validateLink(invalidLink);
            assert(!result.ok, 'Expected link to be invalid');
            assert(result.reason!.includes('http'), 'Error message should mention http');
        }
    },
    {
        name: 'Validação de upload aceita imagem válida',
        fn: () => {
            const result = validateImageUpload(validImage);
            assert(result.ok, `Expected image to be valid, but got: ${result.reason}`);
        }
    },
    {
        name: 'Validação de upload rejeita formato inválido',
        fn: () => {
            const result = validateImageUpload(invalidImage);
            assert(!result.ok, 'Expected image to be invalid');
            assert(result.reason!.includes('Formato'), 'Error message should mention format');
        }
    },
    {
        name: 'Submissão de missão de vídeo aceita link',
        fn: () => {
            // FIX: Updated function call to use the correct object-based argument and check the 'ok' property.
            const result = validateMissionSubmission({ proof: validLink, missionFormat: 'link' });
            assert(result.ok, `Should be valid, but got: ${result.reason}`);
        }
    },
    {
        name: 'Submissão de missão de foto aceita imagem (print)',
        fn: () => {
            // FIX: Updated function call to use the correct object-based argument and check the 'ok' property.
             const result = validateMissionSubmission({ proof: validImage, missionFormat: 'photo' });
            assert(result.ok, `Should be valid, but got: ${result.reason}`);
        }
    },
    {
        name: 'Submissão de missão de foto rejeita link de vídeo',
        fn: () => {
            // The current logic STRICTLY requires image upload for 'photo' missions, so a link should be rejected.
            const result = validateMissionSubmission({ proof: 'https://youtube.com/watch?v=video', missionFormat: 'photo' });
            assert(!result.ok, `Expected invalid because photo mission requires image upload, got OK.`);
        }
    },
    {
        name: 'Submissão de missão de vídeo rejeita data URL de texto',
        fn: () => {
            // FIX: Updated function call to use the correct object-based argument and check the 'ok' property.
            const result = validateMissionSubmission({ proof: invalidImage, missionFormat: 'link' });
            assert(!result.ok, 'Should be invalid');
            // Link format validation fails for data urls usually (starts with http check)
        }
    }
];
