<?php

/**
 * WP-SHIM för headless rendering-tester.
 *
 * Renderar-filerna (plugins/wexoe-pages/sections/*.php) är rena closures som
 * bara rör en liten yta av WordPress-API:t — i praktiken esc_*(), nl2br() och
 * ett par post-helpers. Här definierar vi DEN ytan (och inget mer) så att en
 * renderare kan köras i ren PHP, utan WP, utan databas, utan nätverk.
 *
 * Designval:
 *   - Deterministiskt: wp_generate_password() ger ett FAST värde → identisk
 *     HTML varje körning (snapshot-bart).
 *   - Trogen, inte komplett: esc_html/esc_attr använder htmlspecialchars precis
 *     som WP, så escaping-tester (XSS) är meningsfulla. Vi fejkar inte mer än
 *     renderarna faktiskt anropar.
 *   - Ren funktionsdefinition bakom function_exists() — säkert att require:a en
 *     gång per process (PHPUnit kör allt i samma process).
 *
 * Detta är INTE en WP-runtime. Det testar sektioners HTML-utdata givet känd
 * input — "ger agenten ögon" på renderlagret utan att starta WordPress.
 */

if (!function_exists('esc_html')) {
    function esc_html($t) { return htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('esc_attr')) {
    function esc_attr($t) { return htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8'); }
}
if (!function_exists('esc_html__')) {
    function esc_html__($t, $d = 'default') { return esc_html($t); }
}
if (!function_exists('esc_js')) {
    function esc_js($t) { return str_replace(["\n", "\r", "'", '"', '</'], ['\\n', '', "\\'", '\\"', '<\/'], (string) $t); }
}
if (!function_exists('esc_url')) {
    function esc_url($u) {
        $u = (string) $u;
        // WP strippar farliga scheman; vi gör en trogen delmängd (blockera javascript:).
        if (preg_match('/^\s*javascript:/i', $u)) return '';
        return htmlspecialchars($u, ENT_QUOTES, 'UTF-8');
    }
}
if (!function_exists('esc_url_raw')) {
    function esc_url_raw($u) { return (string) $u; }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($t) { return trim(preg_replace('/\s+/', ' ', strip_tags((string) $t))); }
}
if (!function_exists('wp_kses_post')) {
    function wp_kses_post($t) { return (string) $t; }
}
if (!function_exists('wp_strip_all_tags')) {
    function wp_strip_all_tags($t) { return trim(strip_tags((string) $t)); }
}
if (!function_exists('strip_shortcodes')) {
    function strip_shortcodes($t) { return preg_replace('/\[[^\]]*\]/', '', (string) $t); }
}
if (!function_exists('wp_trim_words')) {
    function wp_trim_words($text, $num = 55, $more = '…') {
        $words = preg_split('/\s+/', trim(strip_tags((string) $text)), -1, PREG_SPLIT_NO_EMPTY);
        if (count($words) <= $num) return implode(' ', $words);
        return implode(' ', array_slice($words, 0, $num)) . $more;
    }
}
if (!function_exists('absint')) {
    function absint($n) { return abs((int) $n); }
}
if (!function_exists('number_format_i18n')) {
    function number_format_i18n($n, $d = 0) { return number_format((float) $n, (int) $d); }
}

// ── Hooks/shortcodes: no-ops (renderarna registrerar dem vid load) ──────────
if (!function_exists('add_action'))    { function add_action(...$a) { return true; } }
if (!function_exists('add_filter'))    { function add_filter(...$a) { return true; } }
if (!function_exists('add_shortcode')) { function add_shortcode(...$a) { return true; } }
if (!function_exists('do_action'))     { function do_action(...$a) {} }
if (!function_exists('apply_filters')) { function apply_filters($tag, $value = null, ...$rest) { return $value; } }
if (!function_exists('shortcode_atts')) {
    function shortcode_atts($defaults, $atts, $shortcode = '') {
        $atts = (array) $atts;
        $out = [];
        foreach ($defaults as $k => $v) { $out[$k] = array_key_exists($k, $atts) ? $atts[$k] : $v; }
        return $out;
    }
}
if (!function_exists('plugin_dir_path')) {
    function plugin_dir_path($file) { return rtrim(dirname($file), '/\\') . '/'; }
}
if (!function_exists('plugin_dir_url')) {
    function plugin_dir_url($file) { return 'https://example.test/wp-content/plugins/' . basename(dirname($file)) . '/'; }
}
if (!function_exists('wp_generate_password')) {
    // FAST värde — gör wrapper_id deterministiskt så HTML är stabil/snapshot-bar.
    function wp_generate_password($length = 12, $special = true, $extra = false) {
        return substr('testpwd000000000000', 0, max(1, (int) $length));
    }
}
if (!function_exists('wp_json_encode')) {
    function wp_json_encode($data, $flags = 0, $depth = 512) { return json_encode($data, $flags, $depth); }
}
if (!function_exists('is_singular')) { function is_singular($t = '') { return false; } }
if (!function_exists('admin_url'))    { function admin_url($path = '') { return 'https://example.test/wp-admin/' . ltrim((string) $path, '/'); } }
if (!function_exists('home_url'))     { function home_url($path = '') { return 'https://example.test/' . ltrim((string) $path, '/'); } }
if (!function_exists('site_url'))     { function site_url($path = '') { return 'https://example.test/' . ltrim((string) $path, '/'); } }
if (!function_exists('rest_url'))     { function rest_url($path = '') { return 'https://example.test/wp-json/' . ltrim((string) $path, '/'); } }
if (!function_exists('wp_create_nonce')) { function wp_create_nonce($action = -1) { return 'testnonce'; } }

// ── Transient/option-cache: kall cache (miss). Renderarna läser via Core::Cache;
//    en miss returnerar false/default precis som en tom WP-installation. Vi gör
//    INTE fetch mot Airtable här — det kräver wp_remote_get + nyckel och hör till
//    Airtable-auditen (tools/airtable-audit.mjs), inte render-smoke-testet. ─────
if (!function_exists('get_transient'))    { function get_transient($k) { return false; } }
if (!function_exists('set_transient'))    { function set_transient($k, $v, $exp = 0) { return true; } }
if (!function_exists('delete_transient')) { function delete_transient($k) { return true; } }
if (!function_exists('get_option'))       { function get_option($k, $default = false) { return $default; } }
if (!function_exists('update_option'))    { function update_option($k, $v, $autoload = null) { return true; } }
if (!function_exists('delete_option'))    { function delete_option($k) { return true; } }
if (!function_exists('wp_using_ext_object_cache')) { function wp_using_ext_object_cache($using = null) { return false; } }
if (!function_exists('wp_cache_get'))     { function wp_cache_get($k, $group = '', $force = false, &$found = null) { $found = false; return false; } }
if (!function_exists('wp_cache_set'))     { function wp_cache_set($k, $data, $group = '', $expire = 0) { return true; } }
if (!function_exists('wp_cache_delete'))  { function wp_cache_delete($k, $group = '') { return true; } }
if (!function_exists('selected')) {
    function selected($a, $b = true, $echo = true) { $r = ((string) $a === (string) $b) ? ' selected="selected"' : ''; if ($echo) echo $r; return $r; }
}
if (!function_exists('checked')) {
    function checked($a, $b = true, $echo = true) { $r = ((string) $a === (string) $b) ? ' checked="checked"' : ''; if ($echo) echo $r; return $r; }
}

// ── Post-accessorer: drivna av en global fixtur så ett test kan välja
//    "inga inlägg" vs "tre inlägg" utan att röra renderaren. ───────────────
$GLOBALS['__wxp_fake_posts'] = [];

if (!function_exists('get_posts')) {
    function get_posts($args = []) {
        $posts = $GLOBALS['__wxp_fake_posts'] ?? [];
        $n = isset($args['numberposts']) ? (int) $args['numberposts'] : (isset($args['posts_per_page']) ? (int) $args['posts_per_page'] : -1);
        return ($n > 0) ? array_slice($posts, 0, $n) : $posts;
    }
}
if (!function_exists('get_the_title'))   { function get_the_title($p) { return is_object($p) ? (string) ($p->post_title ?? '') : ''; } }
if (!function_exists('get_permalink'))   { function get_permalink($p) { $id = is_object($p) ? ($p->ID ?? 0) : (int) $p; return 'https://example.test/?p=' . $id; } }
if (!function_exists('get_the_date'))    { function get_the_date($fmt = '', $p = null) { return '1 jan 2026'; } }
if (!function_exists('get_the_excerpt')) { function get_the_excerpt($p = null) { return is_object($p) ? (string) ($p->post_excerpt ?? '') : ''; } }
if (!function_exists('get_the_post_thumbnail_url')) { function get_the_post_thumbnail_url($p = null, $size = 'post-thumbnail') { return is_object($p) ? (string) ($p->__thumb ?? '') : ''; } }
if (!function_exists('get_the_category')) { function get_the_category($id = 0) { return $GLOBALS['__wxp_fake_categories'] ?? []; } }
if (!function_exists('get_post_meta'))   { function get_post_meta($id, $key = '', $single = false) { return $single ? '' : []; } }
if (!function_exists('get_post_field'))  { function get_post_field($field, $p = null) { return ''; } }

/**
 * Bygg ett fejkat WP_Post-likt objekt för post-drivna sektioner.
 */
if (!function_exists('wxp_fake_post')) {
    function wxp_fake_post(array $overrides = []) {
        return (object) array_merge([
            'ID'           => 101,
            'post_title'   => 'Exempelnyhet',
            'post_content' => 'Brödtext för nyheten med [av_shortcode] som ska strippas.',
            'post_excerpt' => 'Kort ingress.',
            'post_date'    => '2026-01-01 09:00:00',
            'post_status'  => 'publish',
            '__thumb'      => '',
        ], $overrides);
    }
}

/**
 * Nollställ fixtur-globalerna mellan tester.
 */
if (!function_exists('wxp_reset_wp_fixtures')) {
    function wxp_reset_wp_fixtures() {
        $GLOBALS['__wxp_fake_posts'] = [];
        $GLOBALS['__wxp_fake_categories'] = [];
    }
}
