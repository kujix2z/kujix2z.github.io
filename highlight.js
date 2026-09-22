/* Coloration syntaxique légère pour les pages projet.
 *
 * Utilisation dans une page :
 *   <button id="copy" type="button">Copier</button>
 *   <pre><code id="src" data-lang="c">…code échappé en HTML…</code></pre>
 *   <script src="highlight.js"></script>
 *
 * Langages : "python", "c", "ocaml". Pour en ajouter un, ajouter une
 * entrée dans LANGS : une liste de [expression régulière, classe CSS],
 * testée dans l'ordre (la première qui correspond gagne).
 * Les expressions ne doivent pas contenir de groupe capturant "(...)" :
 * utiliser (?:...).
 *
 * Sans JavaScript, le code reste affiché en texte brut.
 */
(function () {
    'use strict';

    var LANGS = {
        python: [
            [/#.*/, 'tk-com'],
            [/(?:[fFbBrR]{1,2})?"(?:\\.|[^"\\\n])*"|(?:[fFbBrR]{1,2})?'(?:\\.|[^'\\\n])*'/, 'tk-str'],
            [/\b(?:class|def|return|if|elif|else|for|in|not|is|import|from|with|as|while|and|or|None|True|False)\b/, 'tk-kw'],
            [/\bself\b/, 'tk-self'],
            [/\b\d+\b/, 'tk-num'],
            [/\b[A-Za-z_]\w*(?=\()/, 'tk-fn']
        ],
        c: [
            [/\/\/.*|\/\*[\s\S]*?\*\//, 'tk-com'],
            [/^[ \t]*#[ \t]*\w+/, 'tk-kw'],                       // #include, #define…
            [/<[A-Za-z_\/]+\.h>/, 'tk-str'],                      // <stdio.h>
            [/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/, 'tk-str'],
            [/\bstruct[ \t]+\w+/, 'tk-struct'],                   // struct + son nom
            [/\b(?:int|char|void|struct|if|else|for|while|do|return|break|continue|sizeof|static|const|unsigned|signed|long|short|double|float|typedef|enum|switch|case|default|goto|extern)\b/, 'tk-kw'],
            [/\b(?:[A-Za-z_]\w*_t|fd_set|FILE)\b/, 'tk-type'],
            [/\b[A-Za-z_]\w*(?=[ \t]*\()/, 'tk-fn'],
            [/\b[A-Z][A-Z0-9_]{2,}\b/, 'tk-num'],                 // constantes / macros
            [/\b\d+\b/, 'tk-num']
        ],
        ocaml: [
            [/\(\*[\s\S]*?\*\)/, 'tk-com'],                       // commentaires (* … *)
            [/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])'/, 'tk-str'], // chaînes et caractères
            [/\b(?:let|and)[ \t]+(?:rec[ \t]+)?[A-Za-z_]\w*/, 'tk-let'],  // let f / let rec f
            [/\b(?:let|rec|and|in|fun|function|match|with|when|if|then|else|begin|end|try|raise|exception|type|of|module|open|struct|sig|val|mutable|while|do|done|for|to|downto|as|assert|lazy|new|object|method|not|mod|land|lor|lxor|asr|lsl|lsr|true|false)\b/, 'tk-kw'],
            [/\b(?:int|bool|string|char|float|unit|array|list|option|exn|ref|\w+_t)\b/, 'tk-type'],
            [/\b[A-Z]\w*\b/, 'tk-type'],                          // modules et constructeurs
            [/\b\d+\b/, 'tk-num']
        ]
    };

    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Un token qui s'étend sur plusieurs lignes (commentaire /* */) est
    // découpé pour que chaque ligne ait ses propres balises.
    function wrap(cls, text) {
        return text.split('\n').map(function (seg) {
            return '<span class="' + cls + '">' + esc(seg) + '</span>';
        }).join('\n');
    }

    function renderStruct(text) {
        var m = /^(struct)([ \t]+)(\w+)$/.exec(text);
        return wrap('tk-kw', m[1]) + m[2] + wrap('tk-type', m[3]);
    }

    // "let rec solve" : le mot-clé reste en tk-kw, le nom lié passe en tk-fn.
    function renderLet(text) {
        var m = /^(let|and)([ \t]+)(?:(rec)([ \t]+))?(\w+)$/.exec(text);
        return wrap('tk-kw', m[1]) + m[2]
            + (m[3] ? wrap('tk-kw', m[3]) + m[4] : '')
            + wrap('tk-fn', m[5]);
    }

    function highlight(raw, lang) {
        var rules = LANGS[lang];
        if (!rules) return esc(raw);

        var re = new RegExp(
            rules.map(function (r) { return '(' + r[0].source + ')'; }).join('|'),
            'gm'
        );

        var out = '', last = 0, m;
        while ((m = re.exec(raw)) !== null) {
            if (m[0] === '') { re.lastIndex++; continue; }
            var idx = 1;
            while (idx <= rules.length && m[idx] === undefined) idx++;
            var cls = rules[idx - 1][1];
            out += esc(raw.slice(last, m.index));
            out += cls === 'tk-struct' ? renderStruct(m[0])
                 : cls === 'tk-let' ? renderLet(m[0])
                 : wrap(cls, m[0]);
            last = re.lastIndex;
        }
        return out + esc(raw.slice(last));
    }

    function withLineNumbers(html) {
        return html.split('\n').map(function (l) {
            return '<span class="ln">' + l + '</span>';
        }).join('');
    }

    // Pour les tests hors navigateur (Node)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { highlight: highlight };
    }
    if (typeof document === 'undefined') return;

    var code = document.getElementById('src');
    if (!code) return;

    var raw = code.textContent.replace(/\s+$/, '');
    code.innerHTML = withLineNumbers(highlight(raw, code.getAttribute('data-lang') || 'python'));

    var btn = document.getElementById('copy');
    if (btn) {
        btn.addEventListener('click', function () {
            function done(t) {
                btn.textContent = t;
                setTimeout(function () { btn.textContent = 'Copier'; }, 1600);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(raw).then(
                    function () { done('Copié'); },
                    function () { done('Échec'); }
                );
            } else {
                done('Échec');
            }
        });
    }
})();
