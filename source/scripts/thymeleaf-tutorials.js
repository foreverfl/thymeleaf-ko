/* 
 * Copyright 2013, The Thymeleaf Project (http://www.thymeleaf.org/)
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * JavaScript for performing post-Pandoc modifications on the Thymeleaf
 * tutorials in order to apply the website standard styles.
 * 
 * @author Emanuel Rabina
 */
(function() {
	'use strict';

	// Add class names to the various table-of-contents levels so they're easier to style
	$$('#toc > ul').forEach(function(el) {
		el.classList.add('level1');
	});
	$$('#toc > ul > li > ul').forEach(function(el) {
		el.classList.add('level2');
	});
	$$('#toc > ul > li > ul > li > ul').forEach(function(el) {
		el.classList.add('level3');
	});
	$$('#toc > ul > li > ul > li > ul > li > ul').forEach(function(el) {
		el.classList.add('level4');
	});

	// Languages used for syntax highlight
	var languages = ['html', 'java', 'javascript', 'xml', 'css', 'text'];

	// Fix the code markup generated by Pandoc to put the right code classes on
	// the right elements.  Makes for semantic code blocks, which is a requirement
	// of Prism.
	languages.forEach(function(language) {
		$$('pre.' + language).forEach(function(pre) {
			pre.classList.remove(language);
			$('code', pre).classList.add('language-' + language);
		});
	});

	// Run the Prism syntax highlighter
	Prism.highlightAll();

	// Have the site menu button reveal the site menu on click
	var toc = $('#toc');
	$('#site-menu-button').addEventListener('click', function(event) {
		toc.classList.toggle('show-toc');
	});

	$$('#toc a').forEach(function(link) {
		link.addEventListener('click', function(event) {
			if (toc.classList.contains('show-toc')) {
				window.addEventListener('hashchange', function offset() {
					window.scrollBy(0, -50);
					toc.classList.remove('show-toc');
					window.removeEventListener('hashchange', offset);
				});
			}
		});
	});

})();