<?php
namespace Wexoe\Core\Renderers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * ContactForm-renderer. CSS-prefix `wxcf-*`.
 *
 * Anropas av wexoe-pages (Tier 2), wexoe-landing-page, wexoe-product-page,
 * wexoe-audience-hero. Returnerar HTML inkl. inline CSS + JS som POST:ar till
 * admin-ajax.php?action=wxcf_submit. Submission landar i `user_submissions`
 * via Core::submission().
 *
 * Visuell referens: det gamla [wexoe_contact_form]-pluginet — navy sektion med
 * subtila geometriska former, vitt formulärkort med skugga, orange CTA-gradient.
 *
 * Två layouter:
 *   split    — två kolumner: info (eyebrow/titel/subtitel/trust/kontaktperson)
 *              till vänster, vitt formulärkort till höger.
 *   centered — en kolumn: ENBART titeln (+ ev. eyebrow) ovanför ett centrerat
 *              formulärkort. Subtitel, trust-signaler och kontaktperson visas
 *              INTE i denna layout (medvetet — minimal variant).
 *
 * För edge-to-edge navy: sätt sektionens layout till `full_bleed` (renderern
 * målar bara sin bakgrund, sektion-ramverket styr bredden — samma mönster som hero).
 *
 * Config (alla optional):
 *   eyebrow           — string
 *   title             — string (default: "Prata med någon som kan automation")
 *   subtitle          — string (visas bara i split)
 *   layout            — 'split' | 'centered'  (default: split)
 *   theme             — 'dark' | 'light'      (default: dark)
 *   show_company      — bool (default: true)
 *   show_phone        — bool (default: true)
 *   show_dropdown     — bool (default: true)
 *   dropdown_label    — string (default: "Vad kan vi hjälpa dig med?")
 *   options           — string[] | string (multiline) | null
 *   cta_text          — string (default: "Skicka")
 *   message_label     — string (default: "Berätta mer (valfritt)")
 *   trust_signals     — string[] | string | null  (format "**Bold** | Resten", visas bara i split)
 *   colors            — array {main?, accent?}  (override-färger)
 *   source_plugin     — string (för User data.Source Plugin)
 *   page_slug         — string (för User data.Page Slug)
 *   contact_person    — array | null {name, title, email, phone, image, quote}  (visas bara i split)
 */
class ContactForm {

    public static function render(array $raw): string {
        $cfg = self::normalize($raw);
        $uniqid = 'wxcf-' . wp_generate_password(8, false, false);
        $nonce = wp_create_nonce('wxcf_submit');
        ob_start();
        echo self::render_html($uniqid, $cfg, $nonce);
        echo self::render_style($uniqid, $cfg);
        echo self::render_script($uniqid);
        return ob_get_clean();
    }

    /**
     * Bygg render-config från en records `contact_form_json`-fält (delat block).
     *
     * JSON lagras i snake_case med oprefixade nycklar (eyebrow, title,
     * show_company, cta_text, …) — exakt samma form som `render()` förväntar
     * sig, så det här är i princip bara en `json_decode` + per-sida-tillägg
     * (colors/source_plugin/page_slug/contact_person).
     *
     * `$extra` mergas ovanpå det avkodade blocket (per-sida-fält som inte bor
     * i det delade blocket). Saknas/ogiltig JSON → tomt block (render() faller
     * tillbaka på sina defaults).
     */
    public static function from_record(array $data, array $extra = []): array {
        $decoded = [];
        $raw = $data['contact_form_json'] ?? null;
        if (is_string($raw) && trim($raw) !== '') {
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) {
                $decoded = $parsed;
            }
        }
        return array_merge($decoded, $extra);
    }

    /* --------------------------------------------------------
       NORMALIZATION
       -------------------------------------------------------- */

    private static function normalize(array $raw): array {
        return [
            'eyebrow'        => (string) ($raw['eyebrow'] ?? ''),
            'title'          => trim((string) ($raw['title'] ?? '')) !== '' ? (string) $raw['title'] : 'Prata med någon som kan automation',
            'subtitle'       => (string) ($raw['subtitle'] ?? ''),
            'layout'         => in_array($raw['layout'] ?? 'split', ['split', 'centered'], true) ? $raw['layout'] : 'split',
            'theme'          => in_array($raw['theme'] ?? 'dark', ['dark', 'light'], true) ? $raw['theme'] : 'dark',
            'show_company'   => isset($raw['show_company']) ? (bool) $raw['show_company'] : true,
            'show_phone'     => isset($raw['show_phone']) ? (bool) $raw['show_phone'] : true,
            'show_dropdown'  => isset($raw['show_dropdown']) ? (bool) $raw['show_dropdown'] : true,
            'dropdown_label' => trim((string) ($raw['dropdown_label'] ?? '')) !== '' ? (string) $raw['dropdown_label'] : 'Vad kan vi hjälpa dig med?',
            'options'        => self::parse_lines($raw['options'] ?? null, [
                'Generell fråga',
                'Diskutera ett projekt',
                'Lägga en order',
                'Minska stillestånd',
                'Förbättra OEE',
                'Info om produkt',
            ]),
            'cta_text'       => trim((string) ($raw['cta_text'] ?? '')) !== '' ? (string) $raw['cta_text'] : 'Skicka',
            'message_label'  => trim((string) ($raw['message_label'] ?? '')) !== '' ? (string) $raw['message_label'] : 'Berätta mer (valfritt)',
            'trust_signals'  => self::parse_trust_signals($raw['trust_signals'] ?? null),
            'colors'         => is_array($raw['colors'] ?? null) ? $raw['colors'] : [],
            'source_plugin'  => (string) ($raw['source_plugin'] ?? 'wexoe-core'),
            'page_slug'      => (string) ($raw['page_slug'] ?? ''),
            'contact_person' => is_array($raw['contact_person'] ?? null) ? $raw['contact_person'] : null,
        ];
    }

    private static function parse_lines($value, array $default): array {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $v) {
                if (is_string($v) && trim($v) !== '') $out[] = trim($v);
            }
            return !empty($out) ? $out : $default;
        }
        if (is_string($value) && $value !== '') {
            $parts = array_values(array_filter(array_map('trim', explode("\n", $value)), function ($l) {
                return $l !== '';
            }));
            return !empty($parts) ? $parts : $default;
        }
        return $default;
    }

    /**
     * Trust signals: en per rad, format "**Bold** | Resten" eller bara fri-text.
     * Returnerar array av {bold, text}.
     */
    private static function parse_trust_signals($value): array {
        $lines = self::parse_lines($value, []);
        $out = [];
        foreach ($lines as $line) {
            if (preg_match('/^\*\*(.+?)\*\*\s*\|?\s*(.*)$/u', $line, $m)) {
                $out[] = ['bold' => trim($m[1]), 'text' => trim($m[2])];
            } else {
                $out[] = ['bold' => '', 'text' => $line];
            }
            if (count($out) >= 3) break;
        }
        return $out;
    }

    /* --------------------------------------------------------
       HTML
       -------------------------------------------------------- */

    private static function render_html($uniqid, array $cfg, $nonce): string {
        $layout_class = 'wxcf--' . $cfg['layout'];
        $theme_class = 'wxcf--' . $cfg['theme'];
        $is_split = $cfg['layout'] === 'split';

        // "(valfritt)" e.dyl. tonas ned inline om labeln slutar på en parentes.
        $message_label = esc_html($cfg['message_label']);
        $message_label = preg_replace('/\s*(\([^()]+\))\s*$/u', ' <span class="wxcf__optional">$1</span>', $message_label);

        ob_start();
        ?>
        <div id="<?= esc_attr($uniqid) ?>" class="wxcf <?= esc_attr($layout_class) ?> <?= esc_attr($theme_class) ?>">
            <span class="wxcf__shape wxcf__shape--1" aria-hidden="true"></span>
            <span class="wxcf__shape wxcf__shape--2" aria-hidden="true"></span>
            <span class="wxcf__shape wxcf__shape--3" aria-hidden="true"></span>

            <div class="wxcf__container">

                <?php if ($is_split): ?>
                <aside class="wxcf__info">
                    <?php if ($cfg['eyebrow'] !== ''): ?>
                        <p class="wxcf__eyebrow"><?= esc_html($cfg['eyebrow']) ?></p>
                    <?php endif; ?>
                    <h2 class="wxcf__title"><?= esc_html($cfg['title']) ?></h2>
                    <?php if ($cfg['subtitle'] !== ''): ?>
                        <p class="wxcf__subtitle"><?= nl2br(esc_html($cfg['subtitle'])) ?></p>
                    <?php endif; ?>

                    <?php if (!empty($cfg['trust_signals'])): ?>
                        <ul class="wxcf__trust">
                            <?php foreach ($cfg['trust_signals'] as $sig): ?>
                                <li class="wxcf__trust-item">
                                    <span class="wxcf__trust-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </span>
                                    <span>
                                        <?php if ($sig['bold'] !== ''): ?><strong><?= esc_html($sig['bold']) ?></strong> <?php endif; ?>
                                        <?= esc_html($sig['text']) ?>
                                    </span>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>

                    <?php if ($cfg['contact_person'] !== null): ?>
                        <div class="wxcf__person">
                            <?php if (!empty($cfg['contact_person']['image'])): ?>
                                <img class="wxcf__person-img" src="<?= esc_url($cfg['contact_person']['image']) ?>" alt="" />
                            <?php endif; ?>
                            <div class="wxcf__person-info">
                                <?php if (!empty($cfg['contact_person']['name'])): ?>
                                    <strong><?= esc_html($cfg['contact_person']['name']) ?></strong>
                                <?php endif; ?>
                                <?php if (!empty($cfg['contact_person']['title'])): ?>
                                    <span><?= esc_html($cfg['contact_person']['title']) ?></span>
                                <?php endif; ?>
                                <?php if (!empty($cfg['contact_person']['email'])): ?>
                                    <a href="mailto:<?= esc_attr($cfg['contact_person']['email']) ?>"><?= esc_html($cfg['contact_person']['email']) ?></a>
                                <?php endif; ?>
                                <?php if (!empty($cfg['contact_person']['phone'])): ?>
                                    <a href="tel:<?= esc_attr(preg_replace('/\s+/', '', $cfg['contact_person']['phone'])) ?>"><?= esc_html($cfg['contact_person']['phone']) ?></a>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endif; ?>
                </aside>
                <?php else: ?>
                <div class="wxcf__head">
                    <?php if ($cfg['eyebrow'] !== ''): ?>
                        <p class="wxcf__eyebrow"><?= esc_html($cfg['eyebrow']) ?></p>
                    <?php endif; ?>
                    <h2 class="wxcf__title"><?= esc_html($cfg['title']) ?></h2>
                </div>
                <?php endif; ?>

                <div class="wxcf__form-wrap">
                    <form class="wxcf__form" novalidate>
                        <input type="hidden" name="_wxcf_nonce" value="<?= esc_attr($nonce) ?>" />
                        <input type="hidden" name="_hp" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" />
                        <input type="hidden" name="source_plugin" value="<?= esc_attr($cfg['source_plugin']) ?>" />
                        <input type="hidden" name="page_slug" value="<?= esc_attr($cfg['page_slug']) ?>" />
                        <input type="hidden" name="page_url" value="" data-current-url="1" />

                        <div class="wxcf__error" role="alert" hidden></div>

                        <div class="wxcf__row wxcf__row--<?= $cfg['show_company'] ? 'two' : 'one' ?>">
                            <label class="wxcf__field">
                                <span class="wxcf__label">Namn <em>*</em></span>
                                <input type="text" name="name" required class="wxcf__input" />
                            </label>
                            <?php if ($cfg['show_company']): ?>
                                <label class="wxcf__field">
                                    <span class="wxcf__label">Företag <em>*</em></span>
                                    <input type="text" name="company" required class="wxcf__input" />
                                </label>
                            <?php endif; ?>
                        </div>

                        <div class="wxcf__row wxcf__row--<?= $cfg['show_phone'] ? 'two' : 'one' ?>">
                            <label class="wxcf__field">
                                <span class="wxcf__label">E-post <em>*</em></span>
                                <input type="email" name="email" required class="wxcf__input" />
                            </label>
                            <?php if ($cfg['show_phone']): ?>
                                <label class="wxcf__field">
                                    <span class="wxcf__label">Telefon</span>
                                    <input type="tel" name="phone" class="wxcf__input" />
                                </label>
                            <?php endif; ?>
                        </div>

                        <?php if ($cfg['show_dropdown'] && !empty($cfg['options'])): ?>
                            <label class="wxcf__field">
                                <span class="wxcf__label"><?= esc_html($cfg['dropdown_label']) ?></span>
                                <select name="behov" class="wxcf__input">
                                    <option value="" disabled selected>Välj ett alternativ</option>
                                    <?php foreach ($cfg['options'] as $opt): ?>
                                        <option value="<?= esc_attr($opt) ?>"><?= esc_html($opt) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </label>
                        <?php endif; ?>

                        <label class="wxcf__field">
                            <span class="wxcf__label"><?= $message_label ?></span>
                            <textarea name="message" rows="4" class="wxcf__input"></textarea>
                        </label>

                        <label class="wxcf__consent">
                            <input type="checkbox" name="newsletter_consent" value="1" />
                            <span class="wxcf__consent-box" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </span>
                            <span class="wxcf__consent-text">Ja, jag vill ta emot nyheter, tips och erbjudanden från Wexoe via e-post. Du kan när som helst avregistrera dig.</span>
                        </label>

                        <button type="submit" class="wxcf__submit">
                            <span><?= esc_html($cfg['cta_text']) ?></span>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                    </form>

                    <div class="wxcf__success" hidden>
                        <span class="wxcf__success-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </span>
                        <h3>Tack för ditt meddelande!</h3>
                        <p>Vi har mottagit din förfrågan och återkommer så snart som möjligt.</p>
                    </div>
                </div>

            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /* --------------------------------------------------------
       CSS
       -------------------------------------------------------- */

    private static function render_style($uniqid, array $cfg): string {
        $p = '#' . esc_attr($uniqid);
        $main = !empty($cfg['colors']['main']) ? esc_attr($cfg['colors']['main']) : '#11325D';
        $accent = !empty($cfg['colors']['accent']) ? esc_attr($cfg['colors']['accent']) : '#F28C28';
        // Custom select-pil (chevron) som data-URI.
        $chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")";

        return <<<CSS
        <style>
        {$p}.wxcf { --wxcf-main: {$main}; --wxcf-accent: {$accent}; position: relative !important; padding: 60px 20px !important; overflow: hidden !important; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
        {$p}.wxcf * { box-sizing: border-box !important; }
        {$p}.wxcf [hidden] { display: none !important; }
        {$p}.wxcf--dark { background: var(--wxcf-main) !important; color: #fff !important; }
        {$p}.wxcf--light { background: #FFFFFF !important; color: #11325D !important; }

        /* Subtila geometriska former (dolda i ljust tema). */
        {$p} .wxcf__shape { position: absolute !important; transform: rotate(45deg) !important; pointer-events: none !important; z-index: 0 !important; background: rgba(255,255,255,0.02) !important; }
        {$p} .wxcf__shape--1 { width: 200px !important; height: 200px !important; top: 18% !important; left: 4% !important; }
        {$p} .wxcf__shape--2 { width: 120px !important; height: 120px !important; top: 52% !important; right: 9% !important; background: rgba(242,140,40,0.05) !important; }
        {$p} .wxcf__shape--3 { width: 280px !important; height: 280px !important; top: -70px !important; right: 13% !important; background: rgba(0,0,0,0.10) !important; }
        {$p}.wxcf--light .wxcf__shape { display: none !important; }

        {$p} .wxcf__container { position: relative !important; z-index: 1 !important; max-width: 900px !important; margin: 0 auto !important; display: grid !important; gap: 40px !important; align-items: start !important; }
        {$p}.wxcf--split .wxcf__container { grid-template-columns: 1fr 1.2fr !important; }
        {$p}.wxcf--centered .wxcf__container { grid-template-columns: 1fr !important; max-width: 560px !important; gap: 22px !important; justify-items: stretch !important; text-align: center !important; }

        /* === INFO / HEAD === */
        {$p} .wxcf__info { padding-top: 18px !important; }
        {$p} .wxcf__head { width: 100% !important; }
        {$p} .wxcf__eyebrow { margin: 0 0 12px !important; font-size: 12px !important; font-weight: 600 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: var(--wxcf-accent) !important; }
        {$p} .wxcf__title { margin: 0 0 12px !important; font-size: clamp(1.6rem, 3vw, 1.9rem) !important; font-weight: 700 !important; line-height: 1.2 !important; color: inherit !important; }
        {$p} .wxcf__subtitle { margin: 0 0 28px !important; font-size: 1.1rem !important; line-height: 1.6 !important; }
        {$p}.wxcf--dark .wxcf__subtitle { color: rgba(255,255,255,0.8) !important; }
        {$p}.wxcf--light .wxcf__subtitle { color: #555 !important; }

        {$p} .wxcf__trust { list-style: none !important; margin: 0 0 28px !important; padding: 0 !important; display: flex !important; flex-direction: column !important; gap: 16px !important; }
        {$p} .wxcf__trust-item { display: flex !important; align-items: flex-start !important; gap: 12px !important; text-align: left !important; }
        {$p} .wxcf__trust-icon { flex-shrink: 0 !important; width: 24px !important; height: 24px !important; margin-top: 1px !important; border-radius: 50% !important; background: var(--wxcf-accent) !important; color: #fff !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        {$p} .wxcf__trust-item > span { font-size: 0.95rem !important; line-height: 1.5 !important; }
        {$p}.wxcf--dark .wxcf__trust-item > span { color: rgba(255,255,255,0.85) !important; }
        {$p}.wxcf--light .wxcf__trust-item > span { color: #444 !important; }
        {$p} .wxcf__trust strong { font-weight: 600 !important; }
        {$p}.wxcf--dark .wxcf__trust strong { color: #fff !important; }
        {$p}.wxcf--light .wxcf__trust strong { color: #11325D !important; }

        {$p} .wxcf__person { display: flex !important; gap: 12px !important; align-items: center !important; margin-top: 8px !important; text-align: left !important; }
        {$p} .wxcf__person-img { width: 52px !important; height: 52px !important; border-radius: 50% !important; object-fit: cover !important; }
        {$p} .wxcf__person-info { display: flex !important; flex-direction: column !important; gap: 2px !important; font-size: 13px !important; }
        {$p} .wxcf__person-info strong { font-size: 14px !important; font-weight: 600 !important; }
        {$p} .wxcf__person-info a { color: inherit !important; text-decoration: none !important; opacity: 0.85 !important; }
        {$p}.wxcf--dark .wxcf__person-info { color: rgba(255,255,255,0.85) !important; }
        {$p}.wxcf--light .wxcf__person-info { color: #444 !important; }

        /* === FORM CARD === */
        {$p} .wxcf__form-wrap { width: 100% !important; background: #fff !important; color: #333 !important; border: 1px solid #e5e7eb !important; border-radius: 12px !important; padding: 30px !important; box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important; text-align: left !important; }
        {$p}.wxcf--light .wxcf__form-wrap { border-color: #e0e0e0 !important; box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important; }
        {$p}.wxcf--centered .wxcf__form-wrap { max-width: 560px !important; margin: 0 auto !important; }

        {$p} .wxcf__form { display: grid !important; gap: 18px !important; }
        {$p} .wxcf__row { display: grid !important; gap: 16px !important; }
        {$p} .wxcf__row--two { grid-template-columns: 1fr 1fr !important; }
        {$p} .wxcf__field { display: block !important; }
        {$p} .wxcf__label { display: block !important; margin-bottom: 6px !important; font-size: 0.85rem !important; font-weight: 600 !important; color: #333 !important; }
        {$p} .wxcf__label em { margin-left: 2px !important; color: var(--wxcf-accent) !important; font-style: normal !important; }
        {$p} .wxcf__optional { font-weight: 400 !important; color: #888 !important; }

        {$p} .wxcf__input { width: 100% !important; max-width: 100% !important; padding: 12px 16px !important; font-size: 1rem !important; font-family: inherit !important; color: #333 !important; background: #fff !important; border: 2px solid #e5e7eb !important; border-radius: 8px !important; outline: none !important; transition: border-color 0.2s ease, box-shadow 0.2s ease !important; }
        {$p} .wxcf__input:focus { border-color: var(--wxcf-main) !important; box-shadow: 0 0 0 3px rgba(17,50,93,0.1) !important; }
        {$p} textarea.wxcf__input { min-height: 80px !important; resize: vertical !important; }
        {$p} select.wxcf__input { cursor: pointer !important; appearance: none !important; -webkit-appearance: none !important; -moz-appearance: none !important; padding-right: 44px !important; background-image: {$chevron} !important; background-repeat: no-repeat !important; background-position: right 14px center !important; background-size: 18px !important; }

        /* === GDPR / CONSENT === */
        {$p} .wxcf__consent { display: flex !important; align-items: flex-start !important; gap: 12px !important; margin: 4px 0 !important; padding: 15px !important; background: #f8f9fa !important; border-radius: 8px !important; cursor: pointer !important; }
        {$p} .wxcf__consent input { position: absolute !important; width: 1px !important; height: 1px !important; opacity: 0 !important; }
        {$p} .wxcf__consent-box { flex-shrink: 0 !important; width: 20px !important; height: 20px !important; margin-top: 1px !important; border: 2px solid #ccc !important; border-radius: 4px !important; background: #fff !important; color: #fff !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: background 0.15s ease, border-color 0.15s ease !important; }
        {$p} .wxcf__consent-box svg { opacity: 0 !important; transition: opacity 0.15s ease !important; }
        {$p} .wxcf__consent input:checked + .wxcf__consent-box { background: var(--wxcf-main) !important; border-color: var(--wxcf-main) !important; }
        {$p} .wxcf__consent input:checked + .wxcf__consent-box svg { opacity: 1 !important; }
        {$p} .wxcf__consent input:focus-visible + .wxcf__consent-box { box-shadow: 0 0 0 3px rgba(17,50,93,0.15) !important; }
        {$p} .wxcf__consent-text { font-size: 0.8rem !important; line-height: 1.5 !important; color: #666 !important; }

        /* === SUBMIT === */
        {$p} .wxcf__submit { width: 100% !important; padding: 16px 32px !important; font-size: 1.1rem !important; font-weight: 600 !important; font-family: inherit !important; color: #fff !important; background: linear-gradient(135deg, var(--wxcf-accent) 0%, #e07b1a 100%) !important; border: none !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 10px !important; box-shadow: 0 4px 12px rgba(242,140,40,0.3) !important; transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease !important; }
        {$p} .wxcf__submit:hover { transform: translateY(-2px) !important; box-shadow: 0 6px 20px rgba(242,140,40,0.4) !important; }
        {$p} .wxcf__submit:active { transform: translateY(0) !important; }
        {$p} .wxcf__submit:disabled { opacity: 0.7 !important; cursor: wait !important; transform: none !important; }

        /* === ERROR === */
        {$p} .wxcf__error { padding: 12px 16px !important; background: #fef2f2 !important; border: 1px solid #fecaca !important; border-radius: 8px !important; color: #b91c1c !important; font-size: 0.9rem !important; }

        /* === SUCCESS === */
        {$p} .wxcf__success { text-align: center !important; padding: 24px 8px !important; }
        {$p} .wxcf__success-icon { width: 64px !important; height: 64px !important; margin: 0 auto 20px !important; border-radius: 50% !important; background: #e8f5e9 !important; color: #2e7d32 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        {$p} .wxcf__success h3 { margin: 0 0 12px !important; font-size: 1.5rem !important; font-weight: 700 !important; color: #11325D !important; }
        {$p} .wxcf__success p { margin: 0 !important; font-size: 1rem !important; line-height: 1.6 !important; color: #666 !important; }

        /* === RESPONSIVE === */
        @media (max-width: 800px) {
            {$p}.wxcf--split .wxcf__container { grid-template-columns: 1fr !important; gap: 24px !important; }
            {$p} .wxcf__info { padding-top: 0 !important; text-align: center !important; }
            {$p} .wxcf__trust { display: none !important; }
            {$p} .wxcf__person { display: none !important; }
            {$p} .wxcf__subtitle { margin-bottom: 0 !important; }
        }
        @media (max-width: 500px) {
            {$p}.wxcf { padding: 40px 16px !important; }
            {$p} .wxcf__form-wrap { padding: 24px 20px !important; }
            {$p} .wxcf__row--two { grid-template-columns: 1fr !important; }
            {$p} .wxcf__title { font-size: 1.5rem !important; }
        }
        </style>
CSS;
    }

    /* --------------------------------------------------------
       JS
       -------------------------------------------------------- */

    private static function render_script($uniqid): string {
        $ajax_url = esc_js(admin_url('admin-ajax.php'));
        ob_start();
        ?>
        <script>
        (function() {
            var root = document.getElementById('<?= esc_js($uniqid) ?>');
            if (!root) return;
            var form = root.querySelector('.wxcf__form');
            var submit = root.querySelector('.wxcf__submit');
            var errorEl = root.querySelector('.wxcf__error');
            var successEl = root.querySelector('.wxcf__success');
            var urlInput = root.querySelector('[data-current-url]');
            if (urlInput) urlInput.value = window.location.href;
            if (!form) return;

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                errorEl.hidden = true;
                errorEl.textContent = '';
                submit.disabled = true;
                var oldText = submit.querySelector('span').textContent;
                submit.querySelector('span').textContent = 'Skickar…';

                var fd = new FormData(form);
                fd.append('action', 'wxcf_submit');

                fetch('<?= $ajax_url ?>', { method: 'POST', body: fd, credentials: 'same-origin' })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data && data.success) {
                            form.hidden = true;
                            successEl.hidden = false;
                            successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            throw new Error((data && data.error) || 'submit_failed');
                        }
                    })
                    .catch(function(err) {
                        errorEl.hidden = false;
                        errorEl.textContent = 'Tyvärr, något gick fel. Försök igen eller mejla oss direkt.';
                        console.error('wxcf submit error:', err);
                    })
                    .finally(function() {
                        submit.disabled = false;
                        submit.querySelector('span').textContent = oldText;
                    });
            });
        })();
        </script>
        <?php
        return ob_get_clean();
    }
}
