<?php
/**
 * Section: text_only (section_type = "text_only")
 *
 * Pelarsida-typisk text-block med eyebrow + h2 + markdown body.
 * Smal layout för läsbarhet, valbar left/center-justering.
 */

if (!defined('ABSPATH')) exit;

return function ($section, $page, $ctx) {
    $eyebrow = (string) ($section['to_eyebrow'] ?? '');
    $h2      = (string) ($section['to_h2']      ?? '');
    $body    = (string) ($section['to_body']    ?? '');
    $align   = (($section['to_align'] ?? 'left') === 'center') ? 'center' : 'left';

    if ($h2 === '' && $body === '' && $eyebrow === '') return '';

    $wid = (string) ($ctx['wrapper_id'] ?? '');
    $attrs = wexoe_pages_section_attrs($section, $ctx, 'wxp-to wxp-to--' . $align);
    ob_start();
    ?>
    <section <?= $attrs ?>>
        <div class="wxp-section__inner wxp-to__inner">
            <?php if ($eyebrow !== ''): ?><p class="wxp-eyebrow"><?= esc_html($eyebrow) ?></p><?php endif; ?>
            <?php if ($h2 !== ''): ?><h2 class="wxp-h2"><?= esc_html($h2) ?></h2><?php endif; ?>
            <?php if ($body !== ''): ?><div class="wxp-body wxp-to__body"><?= wexoe_pages_md($body) ?></div><?php endif; ?>
        </div>
    </section>
    <style>
#<?= esc_attr($wid) ?> .wxp-to__inner { max-width: 760px !important; }
#<?= esc_attr($wid) ?> .wxp-to--center .wxp-to__inner { text-align: center !important; }
#<?= esc_attr($wid) ?> .wxp-to--center .wxp-eyebrow { justify-content: center !important; }
#<?= esc_attr($wid) ?> .wxp-to__body { font-size: 16px !important; line-height: 1.75 !important; color: inherit !important; }
#<?= esc_attr($wid) ?> .wxp-to__body p { margin: 0 0 16px !important; color: inherit !important; }
#<?= esc_attr($wid) ?> .wxp-to__body p:last-child { margin-bottom: 0 !important; }
#<?= esc_attr($wid) ?> .wxp-to__body h3 { font-size: 1.25rem !important; font-weight: 700 !important; margin: 28px 0 12px !important; color: #11325D !important; }
#<?= esc_attr($wid) ?> .wxp-section--theme-dark .wxp-to__body h3 { color: #fff !important; }
/* Markdown list styling is inherited from the base .wxp-body ul/ol rules. */
#<?= esc_attr($wid) ?> .wxp-to__body a { color: #11325D !important; text-decoration: underline !important; }
#<?= esc_attr($wid) ?> .wxp-section--theme-dark .wxp-to__body a { color: #F28C28 !important; }
    </style>
    <?php
    return ob_get_clean();
};
