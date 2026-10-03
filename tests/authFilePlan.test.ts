import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolveAuthFilePlan } from '@/features/authFiles/plan';

describe('resolveAuthFilePlan', () => {
  test('reads the plan the backend recorded on a Claude credential', () => {
    expect(resolveAuthFilePlan({ name: 'a.json', type: 'claude', plan_type: 'max' })).toEqual({
      labelKey: 'claude_quota.plan_max',
      fallback: 'max',
    });
    expect(
      resolveAuthFilePlan({ name: 'a.json', provider: 'claude', plan_type: ' Team ' })
    ).toEqual({ labelKey: 'claude_quota.plan_team', fallback: 'team' });
  });

  test('omits the badge for missing or unrecognized Claude plans', () => {
    expect(resolveAuthFilePlan({ name: 'a.json', type: 'claude' })).toBeNull();
    expect(resolveAuthFilePlan({ name: 'a.json', type: 'claude', plan_type: '' })).toBeNull();
    expect(
      resolveAuthFilePlan({ name: 'a.json', type: 'claude', plan_type: 'plan_max' })
    ).toBeNull();
  });

  test('reads the Codex plan from its id_token claims', () => {
    expect(
      resolveAuthFilePlan({ name: 'c.json', type: 'codex', id_token: { plan_type: 'plus' } })
    ).toEqual({ labelKey: 'codex_quota.plan_plus', fallback: 'plus' });
  });

  test('ignores providers without a recorded plan', () => {
    expect(resolveAuthFilePlan({ name: 'g.json', type: 'gemini', plan_type: 'pro' })).toBeNull();
  });

  test('every Claude plan and the badge title are translated in all locales', () => {
    for (const locale of ['en', 'zh-CN', 'zh-TW', 'ru']) {
      const messages = JSON.parse(
        readFileSync(new URL(`../src/i18n/locales/${locale}.json`, import.meta.url), 'utf8')
      ) as {
        auth_files: Record<string, string>;
        claude_quota: Record<string, string>;
      };
      expect(messages.auth_files.plan_badge).toContain('{{plan}}');
      for (const plan of ['free', 'pro', 'max', 'team']) {
        expect(messages.claude_quota[`plan_${plan}`]).toBeTruthy();
      }
    }
  });
});

describe('auth file card plan badge', () => {
  test('renders the plan inside the card header', () => {
    const source = readFileSync(
      new URL('../src/features/authFiles/components/AuthFileCard.tsx', import.meta.url),
      'utf8'
    );
    const header = source.split('<header')[1].split('</header>')[0];
    expect(source).toContain('resolveAuthFilePlan(file)');
    expect(header).toContain('styles.planBadge');
    expect(header).toContain("t('auth_files.plan_badge', { plan: planLabel })");
  });
});
