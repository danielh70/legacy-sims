/**
 * Copyright (C) 2014 Rodrigo Muñoz <rod@rmk.pw>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// ==UserScript==
// @name        Legacy Enhancement Suite
// @namespace   LES
// @description Improvements to Legacy Game
// @include     https://www.legacy-game.net/*
// @include     https://dev.legacy-game.net/*
// @version     0.0.59
// @grant       none
// @require     https://raw.githubusercontent.com/nnnick/Chart.js/4aa274d5b2c82e28f7a7b2bb78db23b0429255a1/Chart.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.10.4/jquery-ui.js
// @require     https://raw.githubusercontent.com/rodmk/locache/master/locache.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.4.6/mousetrap.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/sprintf/0.0.7/sprintf.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.6.0/underscore.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/URI.js/1.11.2/URI.min.js
// ==/UserScript==
/* global $, jQuery,locache, Mousetrap, URI, ddrivetip, hideddrivetip, bar1,
_,sprintf,Chart, positionToElement, select, pic */

var loaderAnim =
  'data:image/gif;base64,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';
// =============================================================================
//                              Script Set-Up
// =============================================================================
// Avoid conflicting with page's jQuery
this.$ = this.jQuery = jQuery.noConflict(true);
// Clear out expired cache values
locache.cleanup();

// =============================================================================
//                            Primary Entry Point
// =============================================================================
/**
 * Registers a function to be executed on pages where the path matches path
 * rules, where path_rules is an array of regexes. For example,
 * registerFunction(foo, ['bar.php', 'baz.php']) will register foo to be run
 * on bar.php and baz.php.
 */
var function_registry = {};

function registerFunction(fn, path_rules) {
  assert(path_rules !== undefined && path_rules.length > 0, 'path_rules cannot be empty');

  $.each(path_rules, function (i, rule) {
    if (rule in function_registry) {
      function_registry[rule].push(fn);
    } else {
      function_registry[rule] = [fn];
    }
  });
}

/**
 * Executes registered functions based on current path.
 */
function executeFunctions() {
  var current_path = window.location.pathname;
  $.each(function_registry, function (rule, fns) {
    if (current_path.match(rule)) {
      $.each(fns, function () {
        // Log error messages if an individual function fails, but don't stop
        // execution on exception.
        try {
          this();
        } catch (e) {
          console.error(e.message);
          console.error(e.stack);
        }
      });
    }
  });
}
$(document).ready(executeFunctions);

// =============================================================================
//                              Player Class Helper
// =============================================================================
var Player = {
  getHP: function () {
    var hp = 0;
    if (bar1 !== undefined) {
      hp = bar1; // from template.php
    }
    return hp;
  },

  getEnergy: function () {
    var energy = 0;
    if ($('#turnbox').length) {
      energy = parseInt($('#turnbox').text().replace(/\,/g, ''));
    }
    return energy;
  },

  isInWL: function () {
    // Check character bg to see if we're in the WL or not.
    var char_bg = $('div.char-bg');
    var in_wl = false;
    if (char_bg.length > 0) {
      in_wl = char_bg.css('background-image').indexOf('char_bg_waste') > -1;
    }
    return in_wl;
  },
};

// =============================================================================
//                               General Layout
// =============================================================================

/**
 * FEATURE: Adds tooltip hovercards to player items.
 */
registerFunction(
  function addItemHovercards() {
    $('a[href*="javascript:modelesswin"]').each(function () {
      var equipData;
      $(this)
        .mouseover(function () {
          var context = $(this);
          if (!equipData) {
            equipData = '<img src="' + loaderAnim + '" />';
            ddrivetip(equipData, 30);
            $.ajax({
              url: $(this)
                .attr('href')
                .match(/'(.*)'/)
                .pop(),
              async: true,
              success: function (data) {
                //equipData = $('center', data).html();
                equipData = $(data).filter('center').html();
                if (context.is(':hover')) ddrivetip(equipData, 850);
              },
            });
          } else {
            ddrivetip(equipData, 450);
          }
        })
        .mouseout(hideddrivetip);
    });
  },
  ['profile.php', 'market2.php', 'market3.php', 'market6.php'],
);

/**
 * Fetches the earliest time (unixtime, in ms) one can hunt a special NPC.
 * Note that this is only going to be accurate to about the smallest time unit
 * present on the hunting page.
 */
function getNextSpecialHuntTime() {
  function computeNextSpecialHuntTime(data) {
    // Check to see if player is capable of hunting special characters in
    // the first place. If not, return a time far in the future.
    if (!$('font:contains("Special Character Hunting")', data).length) {
      return Number.MAX_VALUE;
    }

    var next_hunt_str = $('font:contains("can hunt again")', data).text();
    var days = next_hunt_str.match(/(\d+) day/);
    if (days) {
      days = parseInt(days[1]);
    }
    var hours = next_hunt_str.match(/(\d+) hour/);
    if (hours) {
      hours = parseInt(hours[1]);
    }
    var minutes = next_hunt_str.match(/(\d+) minute/);
    if (minutes) {
      minutes = parseInt(minutes[1]);
    }
    var seconds = next_hunt_str.match(/(\d+) second/);
    if (seconds) {
      seconds = parseInt(seconds[1]);
    }

    var sec_until_hunt =
      days * SEC_IN_DAY + hours * SEC_IN_HOUR + minutes * SEC_IN_MINUTE + seconds;
    var next_hunt_time = sec_until_hunt * MS_IN_SEC + Date.now();
    return next_hunt_time;
  }

  var next_hunt_time = cachedFetchWithRefresh(
    'hunting:specialhunttime',
    6 * SEC_IN_HOUR,
    '/hunting.php',
    computeNextSpecialHuntTime,
  );

  return next_hunt_time;
}

// =============================================================================
//                                Messages
// =============================================================================
/**
 * FEATURE: Adds confirmation dialog when deleting messages.
 */
registerFunction(
  function addDeleteMessageConfirm() {
    $('a[href*="messages4.php"]').each(function () {
      $(this).click(function () {
        return confirm('Delete Mail?');
      });
    });

    // For the checkbox delete link, override the onclick event handler with the
    // confirm dialog.
    $('a[onclick*="submitchecks(\'delete\');"]').each(function () {
      var clickhandler = $(this)[0].onclick;
      $(this).attr('onclick', 'return false;');

      $(this).click(function () {
        if (confirm('Delete Mail?')) {
          return clickhandler();
        }
      });
    });
  },
  ['messages.php'],
);

// =============================================================================
//                                  Market
// =============================================================================
registerFunction(
  function setUpStandAndStorage() {
    // FEATURE: Auto-check add all items with the same price by default.
    $('input[name="multi"]').prop('checked', true);

    // FEATURE: Bind 'a' to 'add item' button.
    Mousetrap.bind(
      'a',
      _.once(function () {
        var add_btn = $('input[value="Add Item"], input[value="Store Item"]');
        add_btn.click();
      }),
    );

    // FEATURE: Maintain scroll position after taking item from stand.
    preserveScrollPosOnClick($('a:contains("Take One")'));
  },
  ['market3.php', 'market6.php'],
);

registerFunction(
  function autoUpdateStandPricing() {
    // FEATURE: When selecting items from your inventory, if you already have that
    // item in your stand, copy over the price/currency for it.
    var item_selector = $('select[name="item"]');
    item_selector.change(function () {
      var selected_item = $.trim($(this).find('option:selected').text());
      if (!selected_item) {
        return;
      }

      var price_text = $("font.darktext > font:contains('" + selected_item + "')")
        .filter(function () {
          return $(this).text() === selected_item;
        })
        .closest('tbody')
        .find("td:contains('each')");
      var num, currency;
      if (price_text.size()) {
        price_text = $.trim(price_text.first().text());
        var match = price_text.match(/([\d,]+)([cp]) each/);
        num = match[1].replace(/,/g, '');
        currency = match[2];
      } else {
        num = null;
        currency = 'c';
      }
      $('input[name="price"]').val(num);
      $('input[select="currency"]').val(currency === 'c' ? 1 : 2);
    });
    item_selector.change();
  },
  ['market3.php'],
);

/**
 * Function to preserve scroll position on refresh after clicking on a link on
 * the page. On call this function restores scroll position (if any) and sets
 * up onclick handlers on elements to preserve scroll position.
 */
function preserveScrollPosOnClick(elements) {
  var scroll_pos_cache_key = sprintf('scrollpos:%s', location.pathname);

  // Restore scroll position
  var scroll_pos = locache.session.get(scroll_pos_cache_key);
  if (scroll_pos) {
    $(window).scrollTop(scroll_pos);
    locache.session.set(scroll_pos_cache_key, 0);
  }

  // Register onclick handlers for elements
  $.each(elements, function () {
    $(this).click(function () {
      locache.session.set(scroll_pos_cache_key, $(window).scrollTop());
    });
  });
}

/**
 * FEATURE: Find item in stand that you searched for and set scroll position on it
 */
// registerFunction(function scrollToMarketItem() {});

/**
 * FEATURE: automatically attack low level players until the list is empty because this is way too repetitive for a human being
 */

// let checkReturnLink = (cb) => {
//   let bar = setInterval(function () {
//     if ($('#returnLink').length) {
//       console.log('return link exists');
//       clearInterval(bar);
//       cb();
//     } else if ($('button.attackbutton').length) {
//       $('button.attackbutton').click();
//       checkReturnLink();
//     } else if ($("div:contains('you can only attack healthy')").length) {
//       $("a:contains('Back to Attack')").click();
//     } else {
//       console.log('looking for return link');
//     }
//   }, 200);
// };

// let checkSearchPage = (cb) => {
//   let foo = setInterval(function () {
//     if ($('table#searchbox > tbody > tr.search_row').length) {
//       console.log('search page exists');
//       clearInterval(foo);
//       cb();
//     } else {
//       console.log('search page doesnt exist');
//     }
//   }, 200);
// };

// registerFunction(
//   function autoAttack() {
//     checkSearchPage(() => {
//       $('table#searchbox > tbody > tr.search_row:first').click();
//     });

//     checkReturnLink(() => {
//       $('div.hive-back').click();
//     });

//     // checkReturnLink('#returnLink');

//     // wait for <a id='returnLink' /> to show up and then click it and wait for table element to show up again and repeat x amount of times
//   },
//   ['fight2.php', 'fight.php'],
// );
// --- Auto-attack helpers (drop-in replacement) ---

let _searchWatcherRunning = false;
let _returnWatcherRunning = false;

let checkSearchPage = (cb) => {
  if (_searchWatcherRunning) return;
  _searchWatcherRunning = true;

  const start = Date.now();
  const TIMEOUT_MS = 20000;
  let lastRowClick = 0;

  let foo = setInterval(function () {
    // If we already transitioned into a fight UI, stop the search watcher
    if ($('#returnLink').length || $('button.attackbutton').length) {
      clearInterval(foo);
      _searchWatcherRunning = false;
      cb && cb();
      return;
    }

    // Hard stop (prevents infinite loops)
    if (Date.now() - start > TIMEOUT_MS) {
      console.warn('checkSearchPage timed out');
      clearInterval(foo);
      _searchWatcherRunning = false;
      return;
    }

    const $rows = $('table#searchbox > tbody > tr.search_row');
    if ($rows.length) {
      // Click first row, but not every tick
      const now = Date.now();
      if (now - lastRowClick > 800) {
        lastRowClick = now;
        console.log('search page exists -> clicking first row');
        $rows.first().trigger('click'); // often more reliable than .click()
      }
      return;
    }

    // console.log("search page doesnt exist");
  }, 400);
};

let checkReturnLink = (cb) => {
  if (_returnWatcherRunning) return;
  _returnWatcherRunning = true;

  const start = Date.now();
  const TIMEOUT_MS = 30000;
  let lastAttackClick = 0;

  let bar = setInterval(function () {
    // If we're clearly on the search page, just wait (don't time out due to that)
    if ($('table#searchbox > tbody > tr.search_row').length) {
      return;
    }

    // Hard stop
    if (Date.now() - start > TIMEOUT_MS) {
      console.warn('checkReturnLink timed out');
      clearInterval(bar);
      _returnWatcherRunning = false;
      return;
    }

    // Fight ended -> go back to attack setup
    if ($('#returnLink').length) {
      console.log('return link exists');
      clearInterval(bar);
      _returnWatcherRunning = false;

      // Most bulletproof: navigate directly (doesn't rely on click handlers/overlays)
      window.location.assign('fight.php');

      // If you'd rather click the element instead, use:
      // $("#returnLink")[0]?.click();

      cb && cb();
      return;
    }

    // Keep attacking until return link appears (throttled)
    if ($('button.attackbutton').length) {
      const now = Date.now();
      if (now - lastAttackClick > 300) {
        lastAttackClick = now;
        $('button.attackbutton').first().click();
      }
      return;
    }

    // Handle "only attack healthy" message
    if ($("div:contains('you can only attack healthy')").length) {
      $("a:contains('Back to Attack')").first()[0]?.click();
      return;
    }

    // console.log("looking for return link");
  }, 200);
};

// --- Register (drop-in replacement) ---
registerFunction(
  function autoAttack() {
    // Search watcher will click rows until a fight starts
    checkSearchPage();

    // Fight watcher will keep clicking attack, then navigate back to fight.php when done
    checkReturnLink();
  },
  ['fight2.php', 'fight.php'],
);

/**
 * FEATURE: Adds tooltips (where possible) to items in search screen.
 * Credit goes to langer for the implementation.
 */
registerFunction(
  function addMarketSearchTooltips() {
    var markets = {};

    //Select all item rows from search
    $('table.maintable:contains(Name)').each(function () {
      //Scrape item name, price & trades from row
      var name = $(this).find('td:contains("Name")').next().text().trim();
      var price = $(this).find('td:contains("Price")').next().text().trim();
      var trades = $(this).find('td:contains("Trades")').next().text().trim();
      var link = $(this).find('a:has(img)').attr('href');
      var owner = link.split('=').pop();

      //Determine key & count amount of similar items on a given market
      var key = [owner, name, price, trades].join(':');
      markets[key] = markets.hasOwnProperty(key) ? markets[key] + 1 : 0;
      var numb = markets[key];

      //Image hover to show item details
      var item_tooltip;
      $(this)
        .find('img[src*="items"]')
        .mouseover(function () {
          if (!item_tooltip) {
            var market_page = syncGet(link);
            //Find matching item as hovered over
            var match = $('table[cellpadding="1"]', market_page)
              .filter(function () {
                return (
                  $(this).find('td:contains("Name")').next().text().trim() === name &&
                  $(this).find('td:contains("Price")').next().text().trim() === price + ' each' &&
                  $(this).find('td:contains("Trades")').next().text().trim() === trades
                );
              })
              .find('a:has(img)');
            //Make sure the item is still on the market since searching
            if (match.length) {
              //Select the nth similar item on the market under the above attributes
              var item_url = match
                .eq(numb)
                .attr('href')
                .match(/'(.*)'/)
                .pop();
              var item_data = syncGet(item_url);
              item_tooltip = $(item_data).filter('center').html();
            } else {
              item_tooltip = 'Error - Item Cannot Be Found';
            }
          }

          ddrivetip(item_tooltip, 450);
        })
        .mouseout(hideddrivetip);
    });
  },
  ['marketsearch2.php'],
);

// =============================================================================
//                                Abilities
// =============================================================================
/**
 * FEATURE: Removes completed abilities from the training selection options.
 */
registerFunction(
  function trimAbilityList() {
    $('option').each(function () {
      // Check trained level out of total. If they're equal, remove the option.
      var match = $(this).text().match(/\d/g);
      if (match && match.length === 2) {
        if (match[0] === match[1]) {
          $(this).remove();
        }
      }
    });
  },
  ['information2.php'],
);

// =============================================================================
//                               Top 10 Lists
// =============================================================================
/**
 * FEATURE: Adds links to easily-copyable weekly top 10 data.
 */
registerFunction(
  function addOverallTop10ExportButtons() {
    addTop10ExportButton('Highest Levels');
    addTop10ExportButton('Highest Wins');
    addTop10ExportButton('Highest Losses');
    addTop10ExportButton('Achievements Score');
  },
  ['highrecords.php'],
);

/**
 * FEATURE: Adds links to easily-copyable weekly top 10 data.
 */
registerFunction(
  function addWeeklyTop10ExportButtons() {
    addTop10ExportButton('Most Exp Earned');
    addTop10ExportButton('Most Wins');
    addTop10ExportButton('Most Losses');
    addTop10ExportButton('Most Hunting Points');
    addTop10ExportButton('Most Warfare Points');
    addTop10ExportButton('Most Tokens Earned');
  },
  ['weekrecords.php'],
);

/**
 * FEATURE: Adds links to easily-copyable gang top 10 data.
 */
registerFunction(
  function addGangTop10ExportButtons() {
    addTop10ExportButton('Gang List : Highest Levels');
    addTop10ExportButton("Gang List : Last Week's Warfare Points");
  },
  ['gangs2_4.php'],
);

/**
 * Given a table title, adds a button/link to copyable top 10 data.
 */
function addTop10ExportButton(table_title) {
  // Read the scores from the document and parse them
  var table = $('table:contains("' + table_title + '")');
  var players = table.find('a[href*="profile.php"]').map(function (k, v) {
    return $(v).text();
  });
  var scores = table.find('font.colortext')[0].innerHTML.split('<br>');

  // Generate the text to be exported
  var export_text = '';
  for (var i = 0; i < 10; i++) {
    export_text = export_text + (i + 1) + ';' + players[i] + ';' + scores[i] + '\n';
  }
  export_text = encodeURIComponent(export_text);
  var data = 'data:text/plain,' + export_text;

  // Add icon-link to document with exported text
  var link = $('<a>').attr('href', data).append(fontAwesomeIcon('fa-file-text')).css({
    float: 'right',
    position: 'relative',
    right: '5px',
  });

  var title = $('font:contains("' + table_title + '")');
  title.after(link);
}

// =============================================================================
//                                 Combat
// =============================================================================

registerFunction(
  function setUpPlayerCombat() {
    // FEATURE: Pre-fill attack box with first name from list.
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
          // Set first player row as target
          if (mutation.target.className === 'search_row player_row') {
            if (!$('#target').val()) {
              var player_name = $(mutation.addedNodes[0]).text().trim();
              $('#target').val(player_name);
              $('#begin').removeAttr('disabled');
            }
          }

          // Add click handler to 'back to search link' to clear target box
          if (mutation.target.className === 'search_row') {
            var back_link = $(mutation.addedNodes).find('a:contains("Back to Search Setup")');
            if (back_link.length) {
              back_link.click(function () {
                $('#target').val('');
              });
            }
          }
        }
      });
    });
    observer.observe($('#searchbox')[0], {
      subtree: true,
      childList: true,
      characterData: true,
    });

    // FEATURE: Show 'fight player' search results by default.
    var search_btn = $('#search');
    if (search_btn.size() === 1) {
      search_btn.click();
    }
  },
  ['fight.php'],
);

// =============================================================================
//                                Hunting
// =============================================================================
/**
 * FEATURE: Allow the player to combine their newly dropped crystal while
 * hunting.
 * FEATURE: Also adds a "Hunt Again" button to let the player continue to hunt
 * without going back to the hunt page.
 * FEATURE: Adds merging option on inventory page.
 *
 * Credit goes to langer for implementation.
 * Source: https://greasyfork.org/scripts/4375-crystal-check
 */
registerFunction(
  function huntingCrystalImprovements() {
    /*****************************************************
                      General Methods
  /****************************************************/
    //Method to create elements on the fly without injecting html
    function create(type, attr, text, parent) {
      var ele = document.createElement(type);
      for (var x in attr) {
        if (x.hasOwnProperty) {
          ele.setAttribute(x, attr[x]);
        }
      }
      if (text) {
        ele.innerHTML = text;
      }
      if (parent) {
        parent.appendChild(ele);
      }
      return ele;
    }
    //Return user cookies as object
    function getCookies() {
      return document.cookie.split(/[;\s]+/g).reduce(function (a, b) {
        a[b.split('=')[0]] = b.split('=')[1];
        return a;
      }, {});
    }
    /*****************************************************
                      Inventory
  /****************************************************/

    //Inventory API to manipulate inventory items
    function Inventory(html) {
      this.items = getItems();
      // console.log(this.items);
      this.key = html.match(/key=(\w{10})/).pop();
      this.freeSpace = $(html).find('.itemgrid:not(.equipped) td:not(:has(img))').length;
      var key = this.key;
      //Inventory items encapsulated to organise data
      function Item(name, slot, trades, id) {
        this.name = name;
        this.slot = slot;
        this.trades = trades;
        this.id = id;
        //Crystal merging method
        this.merge = function (that, callback) {
          var slot1 = this.slot;
          var slot2 = that.slot;
          $.ajax({
            type: 'POST',
            url: 'inventory10.php?i=' + slot1 + '&key=' + key,
            async: true,
            data: {
              item: slot2,
            },
            success: function (data) {
              //If method available, use on response data to check for further crystal merging
              //Response from merging should be the redirected inventory page, which can be used to
              //refresh inventory data
              if (callback) callback.call(this, data);
            },
          });
        };
      }
      //captures all item data for the inventory & encapsulates as an object
      function getItems() {
        //Match javascript lines on inventory.php for item id & trades
        //Each resulting index corresponds to the slot in inventory
        //var itemPreviews = html.match(/(itemPreviews\[)((.|\n)*?)(Default|table>');/g);
        var tempItems = [];
        var panels = $(html).find('.panel');
        var inven = panels.splice(-2);
        //var buffer = $(panels[1]).find('img.itemicon').length;
        $(inven)
          .find('img.itemicon')
          .each(function () {
            var slot = parseInt($(this).attr('name'));
            var itemID = $(this).attr('id').split('|');
            //console.log(slot,$(this).attr('title'),buffer+slot)
            //var dat = itemPreviews[buffer+slot].replace("Un-tradable", "0 Trade").match(/(\d+)(?=(&c=|\sTrade))/g);
            tempItems.push(new Item(itemID[0], slot, 99999, itemID[1]));
          });
        return tempItems;
      }

      //Returns all crystals in the inventory, sorted by item id (newest first)
      this.getCrystals = function () {
        return (
          this.items
            //check if item is a crystal (must be have some word before crystal Crystal to avoid Crstal Rings)
            .filter(function (a) {
              return a.name.match(/.+Crystal/) !== null;
            })
            //order from newest to oldest (item id descending)
            .sort(function (a, b) {
              return b.id - a.id;
            })
        );
      };
      //Returns an array of matching size/colour crystals
      //Ordered by trades on given crystal ascending, then everything else descending
      this.matchCrystal = function (crystal) {
        return this.getCrystals()
          .filter(function (a) {
            return (
              a.id !== crystal.id && a.name == crystal.name && crystal.name.search('Perfect') == -1
            );
          })
          .sort(function (a, b) {
            return a.trades >= crystal.trades && b.trades >= crystal.trades
              ? a.trades - b.trades
              : b.trades - a.trades;
          });
      };
    }
    /*****************************************************
                      Hunt Recording Methods
  /****************************************************/
    function hunts() {
      function Record(data) {
        this.drops = data.drops || {};
        this.total = data.total || 0;
        this.add = function (drop) {
          this.drops[drop] = this.drops.hasOwnProperty(drop) ? this.drops[drop] + 1 : 1;
          this.total++;
        };
      }
      this.hunts = [];
      this.add = function (huntNumb, drop) {
        this.hunts[huntNumb] = new Record(this.hunts[huntNumb] || {});
        this.hunts[huntNumb].add(drop);
      };
      this.save = function () {
        localStorage.hunts = JSON.stringify(this.hunts);
      };
      this.load = function () {
        var toLoad = localStorage.hunts;
        if (!toLoad) return;
        this.hunts = JSON.parse(toLoad);
      };
      this.toConsole = function (huntGroup) {
        if (!this.hunts.hasOwnProperty(huntGroup)) return;
        var o = this.hunts[huntGroup].drops;
        var outLog = Object.keys(o).map(function (a) {
          return {
            Name: a,
            Qty: o[a],
          };
        });
        console.table(outLog, Object.keys(outLog[0]));
      };
    }

    /*****************************************************
                      Hunting Page Methods
  /****************************************************/
    function huntMerge() {
      // Only run on the post-fight results page
      if (!$('#back-to-hunting').length) return;
      //Once a crystal drop has been detected
      var block = true,
        drop = false,
        loader;

      function checkDrop() {
        function getItemFoundTbody() {
          // Prefer the classic "font:contains('Item Found')" anchor, fallback to any element containing it.
          var anchor = $('font:contains("Item Found")').first();
          if (!anchor.length) {
            anchor = $(
              'b:contains("Item Found"), strong:contains("Item Found"), *:contains("Item Found")',
            ).first();
          }

          var tb = anchor.closest('tbody');
          if (tb.length) return tb[0];

          // ultimate fallback so we at least inject somewhere visible
          return $('tbody').first()[0] || document.body;
        }

        //Display 'found match' message on single line row
        function singleRow(crystal) {
          var r = create('tr', {}, false, getItemFoundTbody());

          create(
            'td',
            {
              width: '100%',
              class: 'standardrow',
              align: 'center',
              colspan: '2',
            },
            'You have a matching ' +
              crystal.name +
              ' in your inventory. <span class="merge" style="cursor:pointer;">[Merge]</span>',
            r,
          );
        }

        //create 'item drop' row displaying merged crystal image + result message
        function doubleRow(crystal) {
          var r = create('tr', {}, false, getItemFoundTbody());

          create(
            'td',
            {
              width: '10%',
              class: 'standardrow',
              align: 'center',
            },
            "<img src='img-bin/items/" + crystal.name.toLowerCase() + ".png'/>",
            r,
          );
          create(
            'td',
            {
              width: '90%',
              class: 'standardrow',
              align: 'center',
            },
            crystal.name + ' added to inventory.',
            r,
          );
        }
        $.ajax({
          url: 'inventory.php?m=0',
          async: true,
          beforeSend: function () {
            loader.start();
          },
          success: function (data) {
            var inv = new Inventory(data);
            $('#invSpace').text(inv.freeSpace);
            var drop = inv.getCrystals()[0];
            //console.log(drop)
            option(drop, inv.matchCrystal(drop));

            // console.log('inv match crystals', inv.matchCrystal(drop));

            loader.stop();
            //recursive method - if crystal match, display option to merge - if merged, display result
            //if crystal match with previous result, offer to match again, etc
            function option(crystal, matches) {
              if (matches.length > 0) {
                singleRow(matches[0]);
                $('span.merge').click(function () {
                  $(this).remove();
                  loader.start();
                  //merge newest crystal [0] with best matching crystal [1]
                  crystal.merge(
                    matches[0],
                    //anonymous function as input for merge callback to display merge option on previously merged crystal
                    function (data) {
                      var nextInv = new Inventory(data);
                      $('#invSpace').text(nextInv.freeSpace);
                      var newCrystal = nextInv.getCrystals()[0];
                      doubleRow(newCrystal);
                      option(newCrystal, nextInv.matchCrystal(newCrystal));
                      $('span.merge').click();
                      loader.stop();
                    },
                  );
                });
              }
            }
          },
        });
      }
      //Build a clickable button which allows the user to attack
      //the same hunt group again without visiting the hunt page again
      //If there are buttons present, the fight is ongoing
      //If there is a page title, user is on error or multiattack screen
      if ($('#back-to-hunting').closest('td').length) {
        //Create Start Another Hunt button & position next to Back to Hunting page url, change row to fit
        //Button defaulted to disabled while waiting for attack string
        // Find the cell that contains the "Back to Hunting" link (id changed on site)
        var td = $('#back-to-hunting').closest('td');
        if (!td.length) {
          console.log('[LES] back-to-hunting is not in a <td> anymore; using fallback insert');
          $('#back-to-hunting').after(
            '<div style="text-align:center; margin-top:8px;">[LES] Hunt UI anchor found</div>',
          );
          return;
        }

        if (!td.length) return; // bail safely if the page layout is unexpected

        // td.prop('width', '50%');
        var newCell = create(
            'td',
            {
              class: 'standardrow',
              width: '50%',
              align: 'center',
              style: 'position:relative',
            },
            false,
            td.parent()[0],
          ),
          // newButt = create(
          //   'input',
          //   {
          //     type: 'button',
          //     class: 'button',
          //     value: 'Start Another Hunt',
          //     disabled: 'disabled',
          //   },
          //   false,
          //   newCell,
          // ),
          newRow = create('tr', {}, false, false);
        create(
          'img',
          {
            id: 'loader',
            src: loaderAnim,
            style: 'position:absolute;top:0px;right:0px;display:none',
          },
          false,
          newCell,
        );
        loader = {
          start: function () {
            block = true;
            // newButt.disabled = true;
            $('#loader').show();
          },
          stop: function () {
            block = false;
            // newButt.disabled = !$('input[name=attackstring]').length;
            $('#loader').hide();
          },
        };
        // ===== ADD THIS RIGHT AFTER loader is created =====

        // Grab the "Item Found" line (post-fight result text)
        var $itemFound = $('font:contains("Item Found")').first();
        var itemText = $itemFound.length ? $itemFound.text() : $('body').text();

        // If the item found is a crystal, run the merge checker
        if (itemText.includes('Item Found') && itemText.includes('Crystal')) {
          console.log('[LES] Crystal drop detected -> running checkDrop()');
          checkDrop();
        } else {
          console.log('[LES] No crystal drop detected, skipping merge check');
        }

        // Update inventory space number so it doesn't stay "##"
        $.ajax({
          url: 'inventory.php?m=0',
          async: true,
          beforeSend: function () {
            loader.start();
          },
          success: function (data) {
            $('#invSpace').text(new Inventory(data).freeSpace);
            loader.stop();
          },
          error: function () {
            loader.stop();
          },
        });

        // ===== END ADD =====

        create(
          'td',
          {
            class: 'standardrow',
            colspan: '2',
            align: 'center',
          },
          "You have <span id='invSpace'>##</span> inventory spaces remaining.",
          newRow,
        );
        // td.before(newCell).parent().after(newRow);
        // Put the inventory-space line somewhere safe:
        $('#back-to-hunting')
          .closest('table')
          .after(
            "<div class='standardrow' style='text-align:center; margin-top:6px;'>You have <span id='invSpace'>##</span> inventory spaces remaining.</div>",
          );

        //Gather attack string from hunting.php && cookie info for next hunt form
        // var form = create(
        //     'form',
        //     {
        //       id: 'les-hunt-form',
        //       action: 'hunting3.php',
        //       method: 'post',
        //       style: 'display:none;',
        //     },
        //     false,
        //     document.body,
        //   ),
        //   attackString,
        //   cookies = getCookies();
        // create(
        //   'input',
        //   {
        //     type: 'hidden',
        //     name: 'group',
        //     value: cookies.hunting_group,
        //   },
        //   false,
        //   form,
        // );
        // create(
        //   'input',
        //   {
        //     type: 'hidden',
        //     name: 'level',
        //     value: cookies.hunting_level,
        //   },
        //   false,
        //   form,
        // );
        // create(
        //   'input',
        //   {
        //     type: 'submit',
        //     value: 'Attack Target',
        //     class: 'button',
        //     id: 'hunt-' + cookies.hunting_group + '-' + cookies.hunting_level,
        //   },
        //   false,
        //   form,
        // );

        // var t = new hunts();
        // t.load();
        // var result = $('font:contains("Item Found")');
        // //Any hunt drop
        // if (result.length) {
        //   t.add(
        //     cookies.hunting_group,
        //     result
        //       .text()
        //       .match(/^Item Found : (.*)(?=\.$)/)
        //       .pop(),
        //   );
        //   //Hunt Group 18 - Crystal Entities and crystal drop
        //   if ($('font:contains("An entity")').length) {
        //     checkDrop();
        //   }

        //   //Sent to void
        // } else if (
        //   $(
        //     'font:contains("An item was dropped but your inventory was full, so it was sent to the void.")',
        //   ).length
        // ) {
        //   t.add(cookies.hunting_group, 'Void');
        //   //No drop (no including when you lose because that could just skew data)
        // } else if (!$('font:contains("You have been defeated"),a[href="map2.php"]').length) {
        //   t.add(cookies.hunting_group, 'NA');
        // }
        // t.save();
        // //Print current record to console, commenting out for debugging
        // //t.toConsole(cookies.hunting_group);

        // if (!drop) {
        //   $.ajax({
        //     url: 'inventory.php?m=0',
        //     async: true,
        //     beforeSend: function () {
        //       loader.start();
        //     },
        //     success: function (data) {
        //       $('#invSpace').text(new Inventory(data).freeSpace);
        //       loader.stop();
        //     },
        //   });
        // }
        // $.ajax({
        //   url: 'hunting.php',
        //   async: true,
        //   success: function (data) {
        //     attackString = data.match(/([a-zA-Z]{20})(?=">')/g).pop();
        //     create(
        //       'input',
        //       {
        //         type: 'hidden',
        //         name: 'attackstring',
        //         value: attackString,
        //       },
        //       false,
        //       form,
        //     );
        //     // (function blockCheck() {
        //     //   if (block) setTimeout(blockCheck, 250);
        //     //   else newButt.disabled = false;
        //     // })();
        //   },
        // });
        //Button method - disable to prevent multi-attack & submit to proceed
        // $(newButt).click(function () {
        //   $(this).prop('disabled', true);
        //   form.submit();
        // });
        // --- RECORD THE RESULT (no auto-hunt button required) ---
        (function recordHuntResult() {
          var t = new hunts();
          t.load();

          // Get group/level from the back link URL: hunting.php?p=1&g=18
          var backHref = $('#back-to-hunting').attr('href') || '';
          var mG = backHref.match(/[?&]g=(\d+)/);
          var mP = backHref.match(/[?&]p=(\d+)/);
          var group = mG ? parseInt(mG[1], 10) : null;
          var level = mP ? parseInt(mP[1], 10) : null;

          if (!group) {
            console.warn(
              '[LES] recordHuntResult: could not determine hunt group from back link',
              backHref,
            );
            return;
          }

          // Extract drop text robustly
          var resultFont = $('font:contains("Item Found")').first();
          var dropName = null;

          if (resultFont.length) {
            // Handles "Item Found : X." and other small formatting differences
            var txt = resultFont.text().replace(/\s+/g, ' ').trim();
            // Try common pattern
            var m = txt.match(/Item Found\s*:?\s*(.+?)(\.)?$/i);
            if (m && m[1]) dropName = m[1].trim();
          }

          // Void case
          var isVoid = $('font:contains("sent to the void")').length > 0;

          // Defeat case (don’t record NA if defeated)
          var wasDefeated = $('font:contains("You have been defeated")').length > 0;

          if (dropName) {
            t.add(group, dropName);
          } else if (isVoid) {
            t.add(group, 'Void');
          } else if (!wasDefeated) {
            t.add(group, 'NA');
          }

          t.save();
          // Optional debug:
          // console.log('[LES] recorded hunt', { group, level, dropName, isVoid, wasDefeated });
        })();
      }
    }
    /*****************************************************
                      Inventory Page Methods
  /****************************************************/

    function invMerge() {
      //Call current inventory as instance of inventory object defined above for managing crystals
      var inv = new Inventory(document.body.innerHTML);
      var mergeForm = create(
        'form',
        {
          method: 'post',
        },
        false,
        document.body,
      );
      var formInput = create(
        'input',
        {
          type: 'hidden',
          name: 'item',
        },
        false,
        mergeForm,
      );
      $('.itemicon').click(function () {
        $('#mergeRow').remove();
      });
      $('img[title*=" Crystal"]').each(function () {
        //Build selectbox containing matching crystal options & merge button
        var slot = $(this).attr('name');
        var row = create(
          'tr',
          {
            id: 'mergeRow',
          },
          false,
          false,
        );
        var col1 = create(
          'td',
          {
            colspan: '2',
          },
          false,
          row,
        );
        var select = create(
          'select',
          {
            name: 'item',
            id: 'crystalSelect',
            class: 'selectbox',
            style: 'width:75%;',
          },
          false,
          col1,
        );
        var merge = create(
          'input',
          {
            id: 'merge',
            type: 'button',
            class: 'button',
            style: 'width:23%',
            value: 'Merge',
          },
          false,
          col1,
        );
        var crystal = inv.getCrystals().reduce(function (a, b) {
          return String(b.slot) === String(slot) ? b : a;
        }, null);

        if (!crystal) {
          console.warn('[LES] invMerge: could not map clicked slot to crystal', {
            slot,
            crystals: inv.getCrystals(),
          });
          return; // stop for this image; don't crash whole script
        }

        var matches = inv.matchCrystal(crystal);

        if (matches.length > 0) {
          matches.forEach(function (a) {
            create(
              'option',
              {
                value: a.slot,
                //}, a.trades + ' Trades | ID:' + a.id, select);
              },
              'Slot #' + a.slot + ' | ID:' + a.id,
              select,
            );
          });
        } else {
          create('option', {}, 'No Matching Crystals', select);
          select.disabled = true;
          merge.disabled = true;
        }
        select.selectedIndex = 0;
        //Add selectbox & button after crystal is selected in inventory
        $(this).click(function () {
          $('#itemPreview tbody').append(row);
        });
        //Merging!
        $(merge).click(function () {
          //Re-create 'crystal to be merged' input as child of form
          formInput.value = select.selectedOptions[0].value;
          mergeForm.action = 'inventory10.php?i=' + crystal.slot + '&key=' + inv.key;
          mergeForm.submit();
        });
      });
    }
    /*****************************************************
                      Hunting Overview Page
  /****************************************************/
    //Method to display drop records for NPCs
    function showDrops() {
      //Colours which the chart will iterate around, feel free to add new ones
      var colorList = ['#F7464A', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
      //Chart options, didn't do much aside from costomise the legend string
      var options = {
        segmentShowStroke: true,
        legendTemplate:
          '<ul class="<%=name.toLowerCase()%>-legend" style="padding:0; text-align:right"><% for (var i=0; i<segments.length; i++){%><li style="margin-left:0px;list-style:none; font-size:9.88px"><%if(segments[i].label){%><%=segments[i].label%> - <%=(segments[i].value/total*100).toFixed(2)%>%<%}%></li><%}%><br/>Total: <%=total%></ul>',
      };
      var t = new hunts();
      t.load();
      var currRow;
      var OldpositionToElement = window.positionToElement;
      //Modify the existing hunt detail update method so the chart & legend fit in and play nice
      window.positionToElement = function () {
        OldpositionToElement.apply(this, arguments);
        //Run animation only when changing between different hunt groups, it's annoying when it's for same group w/ different level
        options.animateRotate = currRow != arguments[0][0].dataset.row;
        currRow = arguments[0][0].dataset.row;
        var record = t.hunts[currRow];
        if (record) {
          var canvas = create('canvas', {
            id: 'huntRec',
            width: 200,
            height: 200,
          });
          $('#group-stats').after(canvas);
          var pieData = [];
          var counter = 0;
          for (var x in record.drops) {
            if (x) {
              counter++;
              pieData.push({
                label: x,
                value: record.drops[x],
                color: colorList[counter % colorList.length],
              });
            }
          }
          var dropChart = new Chart(document.getElementById('huntRec').getContext('2d')).Pie(
            pieData.sort(function (a, b) {
              return b.value - a.value;
            }),
            options,
          );
          $('#group-desc > #group-stats').append(dropChart.generateLegend());
        }
      };
      //Update initial hunt group
      positionToElement(select, false);
    }
    /*****************************************************
                      Misc
  /****************************************************/
    //call methods where relevant
    switch (location.pathname) {
      case '/inventory.php':
        invMerge();
        break;
      case '/hunting3.php':
        huntMerge();
        break;

      case '/hunting.php':
        showDrops();
        break;
    }
  },
  ['hunting.php', 'hunting3.php', 'inventory.php'],
);

// =============================================================================
//                               Wasteland
// =============================================================================
/**
 * FEATURE: Adds a 3x3 hovercard preview to gang alerts.
 */
registerFunction(
  function addAlertPreview() {
    var SQW = 33; // square width = 33px
    var PW = 3 * SQW - 3; // preview width (adjusted for borders)

    // Returns 3x3 map preview centered around x,y coords
    function mapPreview(x, y) {
      // Add 'c' parameter to avoid caching
      var map_uri = URI('/maps/map1_gang.png').query({
        c: Date.now(),
      });
      var overlay_uri = URI('/maps/map1_overlay.png').query({
        c: Date.now(),
      });
      var map_preview = $('<img>')
        .attr({
          src: overlay_uri.href(),
        })
        .css({
          background: sprintf('url(%s)', map_uri.href()),
          // Use CSS to crop/adjust image location
          position: 'absolute',
          clip: sprintf(
            'rect(%dpx, %dpx, %dpx, %dpx)',
            SQW * (y - 2),
            SQW * (x + 1),
            SQW * (y + 1),
            SQW * (x - 2),
          ),
          top: sprintf('%dpx', -SQW * (y - 2)),
          left: sprintf('%dpx', -SQW * (x - 2)),
        });

      var preview = $('<div>')
        .css({
          width: sprintf('%dpx', PW),
          height: sprintf('%dpx', PW),
        })
        .append(map_preview);
      var container = $('<div>').append(preview);

      return container;
    }

    $('#combatlog > font:contains("reported")').each(function () {
      var attack_txt = $(this).text();
      var coords = attack_txt.match(/(\d+),(\d+)/);
      var x = parseInt(coords[1]),
        y = parseInt(coords[2]);
      var map_preview = mapPreview(x, y).html();

      $(this)
        .mouseover(function () {
          ddrivetip(map_preview, PW);
        })
        .mouseout(hideddrivetip);
    });
  },
  ['.*'],
);

// =============================================================================
//                                   Jobs
// =============================================================================
/**
 * FEATURE: Select to do as many jobs as your current energy allows by default.
 */
registerFunction(
  function autoSelectMaxJobs() {
    var energy = Player.getEnergy();
    var energy_cost = parseInt($("tr:contains('Energy Cost') font.text").text());
    var max_jobs = Math.floor(energy / energy_cost);

    $('.selectbox option').each(function () {
      if ($(this).val() <= max_jobs) {
        $(this).prop('selected', true);
      }
    });
  },
  ['jobcenter2.php', 'avatarjob2.php'],
);

// =============================================================================
//                                   Flags
// =============================================================================
/**
 * FEATURE: Provides functionality to upload flags.
 * Credit goes to langer for implementation.
 * Source: https://greasyfork.org/scripts/4374-flag-upload
 */
registerFunction(
  function addFlagUpload() {
    /*****************************************************
                      General Methods
  /****************************************************/
    //
    function create(type, attr, text, parent) {
      var ele = document.createElement(type);
      for (var x in attr) {
        if (x.hasOwnProperty) {
          ele.setAttribute(x, attr[x]);
        }
      }
      if (text) {
        ele.innerHTML = text;
      }
      if (parent) {
        parent.appendChild(ele);
      }
      return ele;
    }

    //Method to convert RGB values into hex for flag variables
    function toHex(r, g, b) {
      var hex = '0123456789ABCDEF',
        ans;
      r = hex.charAt((r - (r % 16)) / 16) + hex.charAt(r % 16);
      g = hex.charAt((g - (g % 16)) / 16) + hex.charAt(g % 16);
      b = hex.charAt((b - (b % 16)) / 16) + hex.charAt(b % 16);
      ans = '#' + r + g + b;
      return ans;
    }
    /*****************************************************
                      CSS Injection
  /****************************************************/
    var custom =
      '' +
      '#uploadPanel{height:auto; width:auto; background: red none; border: 5px solid darkred; padding: 5px; position:absolute; top:20px; left:20px; max-height:90%; max-width:90%; padding-right:20px; overflow:auto;}\n' +
      '#flagOut{border:1px solid #c3c3c3; display:inline-block;}\n' +
      '#container{position:relative; display:block; height:30px; width:40px; padding:1px;}\n' +
      '#rawImage{position: absolute; display:block; z-index:1;}\n' +
      '#getArea{position:absolute; height:30px; width:40px; top:1px; left:1px; border:1px solid red;z-index:2;}\n' +
      '#imageUpload{display:block;}\n' +
      '#editPanel{display:none;}';

    create(
      'link',
      {
        rel: 'stylesheet',
        href: 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.8/themes/base/jquery-ui.css',
      },
      false,
      document.head,
    );
    create(
      'style',
      {
        type: 'text/css',
      },
      custom,
      document.head,
    );

    /*****************************************************
                      Interface Creation & Injection
  /****************************************************/

    var panel = create(
      'div',
      {
        id: 'uploadPanel',
      },
      false,
      document.body,
    );
    create(
      'canvas',
      {
        id: 'flagOut',
        width: '40',
        height: '30',
      },
      false,
      panel,
    );
    create(
      'input',
      {
        id: 'toFlag',
        type: 'button',
        value: 'Send to Flag',
      },
      false,
      panel,
    );
    create('span', {}, '<br/>Resize Select Box:', panel);
    create(
      'input',
      {
        id: 'resizeToggle',
        type: 'checkbox',
      },
      false,
      panel,
    );
    create('span', {}, '<br/>Keep Aspect Ratio:', panel);
    create(
      'input',
      {
        id: 'Aratio',
        type: 'checkbox',
        checked: 'checked',
        disabled: 'disabled',
      },
      false,
      panel,
    );
    create('span', {}, '<br/>', panel);
    create(
      'input',
      {
        id: 'reset',
        type: 'button',
        value: 'Reset to 40X30',
      },
      false,
      panel,
    );
    create(
      'input',
      {
        id: 'rawImgHide',
        type: 'button',
        value: 'Show/Hide Canvas',
      },
      false,
      panel,
    );
    create('span', {}, '<br/>', panel);
    create(
      'span',
      {
        id: 'edit',
      },
      'Editing Tools',
      panel,
    );
    var edit = create(
      'div',
      {
        id: 'editPanel',
      },
      false,
      panel,
    );
    create(
      'input',
      {
        id: 'greyscale',
        type: 'button',
        value: 'Greyscale',
      },
      false,
      edit,
    );
    create(
      'input',
      {
        id: 'invert',
        type: 'button',
        value: 'Invert',
      },
      false,
      edit,
    );
    var container = create(
      'div',
      {
        id: 'container',
      },
      false,
      panel,
    );
    create(
      'canvas',
      {
        id: 'rawImage',
        width: '40',
        height: '30',
      },
      false,
      container,
    );
    create(
      'div',
      {
        id: 'getArea',
      },
      false,
      container,
    );
    create(
      'input',
      {
        id: 'imageUpload',
        type: 'file',
      },
      false,
      panel,
    );

    /*****************************************************
                      Canvas Methods
  /****************************************************/

    //Sends image data to 'large' canvas, from which we can select the desired area
    function toRawCanvas(imgData) {
      var img = new Image(),
        rawcanvas = document.getElementById('rawImage'),
        context = rawcanvas.getContext('2d'),
        area;
      img.src = imgData;
      img.onload = function () {
        var container = document.getElementById('container');
        container.style.height = img.height + 2 + 'px';
        container.style.width = img.width + 2 + 'px';
        rawcanvas.height = img.height + 2;
        rawcanvas.width = img.width + 2;
        context.drawImage(img, 1, 1);
        area = document.getElementById('getArea');
        area.style.top = '1px';
        area.style.left = '1px';
      };
    }

    //Ctrl + V to paste an image to the canvas
    //Currently only available with Chrome
    function onPasteHandler(e) {
      if (e.clipboardData) {
        var items = e.clipboardData.items,
          blob,
          source;
        if (!items) {
          alert('Image Not found');
        }
        for (var i = 0; i < items.length; ++i) {
          if (items[i].type.match('image.*')) {
            blob = items[i].getAsFile();
            source = window.webkitURL.createObjectURL(blob);
            toRawCanvas(source);
          }
        }
      }
    }
    //Use jQuery UI to allow the capture div inside the raw canvas to move freely when dragging
    $(function () {
      $('#getArea').draggable({
        containment: 'parent',
      });
      window.addEventListener('paste', onPasteHandler);
    });
    //Show/Hide the Raw Canvas from view
    //Mainly for when the image is larger than the window, or file upload is difficult to see
    $('#rawImgHide').click(function () {
      $('#container').slideToggle('slow');
    });
    //Reset the capture div back to default size
    $('#reset').click(function () {
      var area = document.getElementById('getArea');
      area.style.height = '30px';
      area.style.width = '40px';
    });
    //Allow the capture div to be resizable (jQuery UI)
    //Aspect ratio can only be enabled/disabled when the capture div is resizable
    $('#resizeToggle').click(function () {
      if (this.checked) {
        if ($('#Aratio').is(':checked')) {
          $('#getArea').resizable({
            aspectRatio: true,
            containment: 'parent',
          });
        } else {
          $('#getArea').resizable({
            containment: 'parent',
          });
        }
        $('#Aratio').prop('disabled', '');
      } else {
        $('#getArea').resizable('destroy');
        $('#Aratio').prop('disabled', 'disabled');
      }
    });
    //Enable/Disable aspect ratio on capture div
    //Disabling may cause stretching/skewing of output flag
    $('#Aratio').click(function () {
      if (this.checked) {
        $('#getArea').resizable('destroy');
        $('#getArea').resizable({
          aspectRatio: true,
          containment: 'parent',
        });
      } else {
        $('#getArea').resizable('destroy');
        $('#getArea').resizable({
          aspectRatio: false,
          containment: 'parent',
        });
      }
    });
    //Image upload from local machine to raw canvas
    $('#imageUpload').change(function () {
      if (document.getElementById('imageUpload').files.length === 0) {
        return;
      }
      var flag = document.getElementById('imageUpload').files[0],
        reader;
      if (!flag.type.match('image.*')) {
        alert('Not an image');
        return;
      }
      reader = new FileReader();
      reader.onload = (function () {
        return function (e) {
          toRawCanvas(e.target.result);
        };
      })(flag);
      reader.readAsDataURL(flag);
    });
    //After moving capture div to desired area, send containing image to secondry canvas to preview before sending to legacy page
    //Resize to fit 40X30 pixels where needed using native methods
    $('#getArea').mouseup(function () {
      var rawcanvas = document.getElementById('rawImage'),
        out = document.getElementById('flagOut'),
        area = document.getElementById('getArea'),
        outctx = out.getContext('2d'),
        x = parseInt(area.style.left, 10),
        y = parseInt(area.style.top, 10);
      outctx.clearRect(0, 0, out.width, out.height);
      outctx.drawImage(
        rawcanvas,
        x,
        y,
        area.clientWidth,
        area.clientHeight,
        0,
        0,
        out.width,
        out.height,
      );
    });
    //Sent image from preview canvas to legacy page, adjusting page variables and 'pixel' block backgrounds
    $('#toFlag').click(function () {
      var canvas = document.getElementById('flagOut'),
        context = canvas.getContext('2d'),
        w = canvas.width,
        h = canvas.height,
        imgd = context.getImageData(0, 0, w, h),
        pix = imgd.data;

      for (var i = 0; i < h; i++) {
        for (var j = 0; j < w; j++) {
          document.getElementsByName('X' + j + 'Y' + i)[0].bgColor = pic[j + i * w] = toHex(
            pix[(j + i * w) * 4],
            pix[(j + i * w) * 4 + 1],
            pix[(j + i * w) * 4 + 2],
          );
        }
      }
    });
    /*****************************************************
                      Effect Addons
  /****************************************************/
    //Hide/Show effect options
    $('#edit').click(function () {
      $('#editPanel').slideToggle();
    });
    //Perform greyscale effect on output flag
    $('#greyscale').click(function () {
      document.getElementById('flagOut').greyscale();
    });
    //Invert output flag colours
    $('#invert').click(function () {
      document.getElementById('flagOut').invert();
    });

    HTMLCanvasElement.prototype.greyscale = function () {
      var ctx = this.getContext('2d'),
        data = ctx.getImageData(0, 0, this.width, this.height),
        d = data.data;
      for (var i = 0; i < d.length; i += 4) {
        d[i] = d[i + 1] = d[i + 2] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      }
      ctx.putImageData(data, 0, 0);
    };

    HTMLCanvasElement.prototype.invert = function () {
      var ctx = this.getContext('2d'),
        data = ctx.getImageData(0, 0, this.width, this.height),
        d = data.data;
      for (var i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
      ctx.putImageData(data, 0, 0);
    };
  },
  ['flag.php'],
);

// =============================================================================
//                                 Constants
// =============================================================================
var MS_IN_SEC = 1000;
var SEC_IN_MINUTE = 60;
var SEC_IN_HOUR = 60 * SEC_IN_MINUTE;
var SEC_IN_DAY = 24 * SEC_IN_HOUR;

// Legacy server runs on EST (UTC-5)
var SERVER_UTC_OFFSET_HRS = -5;

// =============================================================================
//                                 Utilities
// =============================================================================
function cacheSet(key, value, timeout) {
  if (value !== undefined) {
    locache.set(sessionKey(key), value, timeout);
  }
}

function cacheGet(key) {
  return locache.get(sessionKey(key));
}

/**
 * Adds caching to a function. Fetches from cache if value is there, otherwise
 * generates, stores in cache, and returns results of fetch_fn.
 */
function cachedFetch(key, timeout, fetch_fn) {
  var value = cacheGet(key);
  if (value === null) {
    value = fetch_fn();
    cacheSet(key, value, timeout);
  }
  return value;
}

/**
 * Fetching/caching function. If already at url, applies fn, and stores result
 * in cache. Otherwise, fetches key from cache if available, and if not in
 * cache then does an ajax get to url and applies fn to compute return value.
 */
function cachedFetchWithRefresh(key, timeout, path, fn) {
  var value;

  if (window.location.pathname === path) {
    value = fn(document);
    if (value !== undefined) {
      cacheSet(key, value, timeout);
      return value;
    }
  }

  value = cachedFetch(key, timeout, function () {
    var ret = fn(syncGet(path));
    return ret;
  });

  return value;
}

/**
 * Transforms a key such that it is only valid for the current session. Should
 * be used for all cache keys.
 */
function sessionKey(key) {
  var legacy_hash;
  switch (URI(window.location.href).subdomain()) {
    case 'www':
      legacy_hash = document.cookie.match(/legacy_hash=(\w+)/)[1];
      break;
    case 'dev':
      legacy_hash = document.cookie.match(/legacy_hash_dev=(\w+)/)[1];
      break;
  }
  return key + ':' + legacy_hash;
}

/**
 * Returns a font awesome icon. Loads required CSS to page if necessary.
 */
function fontAwesomeIcon(klass) {
  // Load CSS stylesheet if not loaded yet.
  if (!$('link[href*="font-awesome.min.css"]').length) {
    $('head').append(
      $(
        '<link href="//maxcdn.bootstrapcdn.com/font-awesome/4.1.0/css/font-awesome.min.css" rel="stylesheet">',
      ),
    );
  }
  return $('<i class="fa ' + klass + '"></i>');
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

/**
 * Does a synchronous (blocking) get and returns the result.
 */
function syncGet(url) {
  var fetched_data;
  $.ajax({
    url: url,
    async: false,
    success: function (data) {
      fetched_data = data;
    },
  });
  return fetched_data;
}

/**
 * Simple utility assert function.
 */
function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

// ====================================== END ==================================
