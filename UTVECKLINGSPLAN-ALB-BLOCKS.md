# Utvecklingsplan — Egna Enfold/Avia ALB-blocks för Wexoe-innehåll

Mål: Ersätta dagens manuella `[wexoe_page slug="..."]`-shortcodes (i Enfold Code Block) med riktiga Avia Layout Builder-element. Redaktören väljer i builder-modalen:

1. **Innehållstyp** — vilken Wexoe-entitet (`landing_pages`, `cms_unique_pages`, `partners`, etc.)
2. **Specifik post** — vilken record som ska renderas, listad dynamiskt utifrån vald typ

---

## 1. Förutsättningar och beslut

| Fråga | Beslut |
|---|---|
| Var bor koden? | Eget plugin `wexoe-alb-blocks` under `New plugins/`. Inte i child-theme (överlever temauppdateringar). |
| Beroenden | `wexoe-core` (data via `\Wexoe\Core\Core::entity()`), Enfold-temat aktivt (`current_theme_supports('avia_builder')` / `class_exists('aviaShortcodeTemplate')`). |
| En modul per entitet eller en generisk? | **Generisk** modul `wexoe_content` med dropdown för typ + AJAX-laddad dropdown för post. Mindre underhåll, en symbol i builder. |
| Frontend-rendering | Återanvänd befintliga render-funktioner från `wexoe-pages`, `wexoe-landing-page` m.fl. ALB-modulen mappar typ → existerande shortcode-handler eller render-funktion. |
| Builder-preview | Enkel platshållare först (titel + entitetsnamn). Live-preview kan läggas till senare. |

---

## 2. Referensmaterial

Läs innan kod skrivs (alla under `wp-content/themes/enfold/`):

- `config-templatebuilder/avia-template-builder/php/base-classes/class-popup-templates.php` — `aviaShortcodeTemplate` (basklass).
- `config-templatebuilder/avia-template-builder/php/base-classes/class-shortcode-inserter.php` — `ShortCode_Inserter` (registrering).
- `config-templatebuilder/avia-shortcodes/textblock/textblock.php` — enklaste referens-modulen.
- `config-templatebuilder/avia-shortcodes/postslider/postslider.php` — exempel på dynamisk `select` som listar inlägg.
- `config-templatebuilder/avia-template-builder/php/base-classes/class-popup-templates.php` → metoderna `popup_elements()`, `shortcode_handler()`, `editor_element()`, `editor_sub_element()`.

Inofficiellt API — versionera mot specifik Enfold-version och regressionstesta vid temauppdatering.

---

## 3. Arkitektur

```
wexoe-alb-blocks/
├── wexoe-alb-blocks.php          # Plugin-bootstrap, dependency check, registrering
├── includes/
│   ├── class-wexoe-content-block.php   # aviaShortcodeTemplate-subklass
│   ├── content-types.php               # Registry: typ-slug → label, list-callback, render-callback
│   └── ajax.php                        # AJAX-endpoint för "lista poster av typ X"
└── assets/
    ├── builder-icon.svg
    └── builder.css                     # (valfritt) styling i ALB-modal
```

### 3.1 Content-type registry

En filtrerbar array som mappar Wexoe-entiteter till hur de listas och renderas:

```php
// includes/content-types.php
function wexoe_alb_content_types() {
    return apply_filters('wexoe_alb_content_types', [
        'cms_unique_pages' => [
            'label'   => 'Wexoe Page (meta-sida)',
            'entity'  => 'cms_unique_pages',
            'list'    => 'wexoe_alb_list_unique_pages',   // returnerar [['id'=>slug,'label'=>'Om oss'], ...]
            'render'  => 'wexoe_alb_render_unique_page',  // tar slug, returnerar HTML
        ],
        'landing_pages' => [
            'label'   => 'Landningssida',
            'entity'  => 'landing_pages',
            'list'    => 'wexoe_alb_list_landing_pages',
            'render'  => 'wexoe_alb_render_landing_page',
        ],
        // partners, audience_hero, product_area, contact_page, automation_pillar, ...
    ]);
}
```

Varje render-callback delegerar till befintlig kod i respektive feature-plugin → noll duplicering.

### 3.2 ALB-modulen

```php
// includes/class-wexoe-content-block.php
if (!class_exists('aviaShortcodeTemplate')) return;

class Wexoe_Content_Block extends aviaShortcodeTemplate {

    function shortcode_insert_button() {
        $this->config['name']        = __('Wexoe Content', 'wexoe');
        $this->config['self_closing']= 'yes';
        $this->config['shortcode']   = 'wexoe_content';   // <-- ALB shortcode-namn
        $this->config['icon']        = WEXOE_ALB_URL . 'assets/builder-icon.svg';
        $this->config['order']       = 50;
        $this->config['target']      = 'avia-target-insert';
        $this->config['tab']         = __('Content Elements', 'avia_framework');
        $this->config['tooltip']     = __('Infoga Wexoe-innehåll från Airtable', 'wexoe');
        $this->config['tinyMCE']     = ['disable' => 'true'];
    }

    function popup_elements() {
        $types = [];
        foreach (wexoe_alb_content_types() as $slug => $cfg) {
            $types[$slug] = $cfg['label'];
        }

        $this->elements = [
            [
                'name'    => __('Innehållstyp', 'wexoe'),
                'desc'    => __('Vilken sorts Wexoe-innehåll', 'wexoe'),
                'id'      => 'content_type',
                'type'    => 'select',
                'std'     => 'cms_unique_pages',
                'subtype' => $types,
            ],
            [
                'name'    => __('Välj post', 'wexoe'),
                'desc'    => __('Listan filtreras utifrån vald typ', 'wexoe'),
                'id'      => 'content_id',
                'type'    => 'select',
                'std'     => '',
                'subtype' => wexoe_alb_initial_options(),  // alla i platt struktur, JS filtrerar
            ],
        ];
    }

    function editor_element($params) {
        $params['innerHtml']  = "<div class='avia_textblock'>";
        $params['innerHtml'] .= "<strong>Wexoe Content:</strong> ";
        $params['innerHtml'] .= esc_html($params['args']['content_type'] ?? '');
        $params['innerHtml'] .= " / " . esc_html($params['args']['content_id'] ?? '—');
        $params['innerHtml'] .= "</div>";
        return $params;
    }

    function shortcode_handler($atts, $content = '', $shortcodename = '') {
        $atts = shortcode_atts([
            'content_type' => '',
            'content_id'   => '',
        ], $atts, $shortcodename);

        $types = wexoe_alb_content_types();
        if (empty($types[$atts['content_type']])) return '';
        $cfg = $types[$atts['content_type']];
        if (!is_callable($cfg['render']) || $atts['content_id'] === '') return '';

        return call_user_func($cfg['render'], $atts['content_id']);
    }
}
```

### 3.3 Dynamisk dropdown

Enfolds `select`-subtype är statisk vid sidladdning. Två alternativ:

- **A. Förladda allt + JS-filter (rekommenderat första iteration):** Skicka alla poster (typ-prefixade keys) i `subtype` och lägg på en liten JS-snutt som lyssnar på `#content_type` och döljer/filtrerar `<option>`-elementen i `#content_id`. Räcker så länge totala antalet poster är < ~500.
- **B. AJAX-driven:** Registrera `wp_ajax_wexoe_alb_list` som returnerar `[{id,label}]` för vald typ. JS i builder-modal lyssnar på `change` och rebyggor `#content_id`. Mer kod men skalar.

Börja med A → migrera till B om listorna växer.

### 3.4 AJAX-endpoint (för alt. B / framtida bruk)

```php
add_action('wp_ajax_wexoe_alb_list', function () {
    check_ajax_referer('wexoe_alb');
    if (!current_user_can('edit_posts')) wp_send_json_error([], 403);

    $type = sanitize_key($_POST['type'] ?? '');
    $types = wexoe_alb_content_types();
    if (empty($types[$type]) || !is_callable($types[$type]['list'])) wp_send_json_error();

    wp_send_json_success(call_user_func($types[$type]['list']));
});
```

---

## 4. Genomförandeordning

### Fas 1 — Skelett (½ dag)
1. Skapa pluginmappen `New plugins/wexoe-alb-blocks/` med bootstrap-fil och dependency checks (`wexoe-core` + Enfold).
2. Registrera modulen via `ShortCode_Inserter` så ikonen syns i ALB-modalen.
3. Hårdkoda en typ (`cms_unique_pages`) och en select med statiska val. Verifiera att shortcode `[wexoe_content content_type="..." content_id="..."]` sparas och renderas.

### Fas 2 — Content-type registry (½ dag)
4. Implementera `wexoe_alb_content_types()` med `apply_filters`.
5. Skriv `list`- och `render`-callbacks för `cms_unique_pages` som delegerar till `wexoe-pages`-render-funktionen.
6. Lägg till resterande entiteter: `landing_pages`, `partners`, `audience_hero`, `product_area`, `contact_page`, `automation_pillar`.

### Fas 3 — Dynamisk dropdown (½–1 dag)
7. Implementera alternativ A (förladdad lista + JS-filter). Lägg JS via `admin_enqueue_scripts` på `post.php`/`post-new.php`.
8. Testa i builder-modalen i alla supportade postlägen (page, post, ev. CPT).

### Fas 4 — Polering (½ dag)
9. SVG-ikon i Wexoe-stil.
10. `editor_element`-preview med entitets-label + post-label (inte slugen).
11. Översättningssträngar via `wexoe`-textdomän.
12. Cap-check: bara `edit_posts` ska kunna lista.

### Fas 5 — Hardening (löpande)
13. Regressionstest mot ny Enfold-version vid varje uppgradering — pinnat versionsnummer i `IMPLEMENTATION_LOG.md`.
14. Migrera till AJAX (alt. B) om listor blir för stora.
15. Lägg till live preview via `ajax_callback` om/när redaktörerna behöver det.

---

## 5. Risker och mitigering

| Risk | Mitigering |
|---|---|
| Enfold byter intern API på `aviaShortcodeTemplate` | Klassen är publik och har varit stabil i flera år. Kapsla allt vårt bakom `class_exists`-guards så pluginet failar tyst om Enfold byts ut. |
| Builder-modalen visar inte ändringar i `popup_elements` efter cache | Avia builder cachar element-struktur i `aviaBuilderTemplate`-options. Kör `Update Avia Templates`-knappen i Enfold → Theme Options vid struktur-ändring, eller bumpa plugin-versionen. |
| Stora listor (500+ partners) gör modalen seg | Gå till AJAX-läge (alt. B) redan från start om någon entitet har > 200 poster. |
| Shortcode `[wexoe_content]` krockar med befintlig | Verifiera med `has_shortcode` och prefixa hårt; vårt namn är ovanligt nog. |
| Builder-preview kräver Airtable-anrop = långsam editorn | Använd Core:s cache (`Core::entity()->all()` är cachad). Render-callback ska aldrig forcerefresha. |

---

## 6. Definition of Done

- [ ] Plugin aktiveras utan PHP-warnings på en site med Enfold + wexoe-core.
- [ ] "Wexoe Content"-ikonen syns under Content Elements i ALB.
- [ ] Båda dropdowns fungerar och content_id-listan ändras när content_type byts.
- [ ] Sparad sida renderar samma HTML som tidigare manuell `[wexoe_page slug="..."]`.
- [ ] Alla sex entiteter (pages, landing_pages, partners, audience_hero, product_area, contact_page, automation_pillar) är tillgängliga.
- [ ] Befintliga sidor som använder gamla Code Block-shortcodes fortsätter att fungera oförändrat (parallell drift, ingen migrering tvingas).
- [ ] `IMPLEMENTATION_LOG.md` uppdaterad med Enfold-version som koden testats mot.

---

## 7. Öppna frågor att stämma av före start

1. Ska vi behålla `[wexoe_page]` m.fl. parallellt för bakåtkompatibilitet, eller skriva en migrering som ersätter dem med `[wexoe_content]` i `post_content`?
2. Vilken Enfold-version körs i produktion? (avgör vilka filer vi referenslär från)
3. Ska blocket kunna placeras i alla kolumnbredder, eller bara i full-width sektioner?
4. Behövs CSS/spacing-fält på själva blocket, eller räcker det att rendringen lever inuti en vanlig Color Section som redaktören styr?
