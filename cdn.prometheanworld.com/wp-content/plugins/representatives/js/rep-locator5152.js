(function($){
    $(function(){

        function renderRow(row, typeSlug, isUnitedStates) {
            var company = row.company || '';
            var city = row.city || '';
            var email = row.email || '';
            var logo = row.logo || '';
            var phone = row.phone || '';
            var website = row.website || '';
            var province = row.province || '';
            var address = row.address || '';

            if (province && row.type == 'NorthAmerica') {
                city = city + ', ' + province;
            }

            var phoneLink = !!phone ? 'tel:' + phone.replace(/\D/g, '') : '';
            var emailLink = !!email ? 'mailto:' + email : '';
            var websiteLink = !!website ? website : '';

            if (websiteLink && websiteLink.indexOf('http:') == -1 && websiteLink.indexOf('https:') == -1) {
                websiteLink = 'http://' + websiteLink;
            }

            var phoneHtml = !!phoneLink ? '<a href="'+phoneLink+'">' + phone + '</a>' : '';
            var emailHtml = !!emailLink ? '<a href="'+emailLink+'">' + email + '</a>' : '';
            var websiteHtml = !!websiteLink ? '<a target="_blank" href="'+websiteLink+'">Visit Website <span class="fa fa-external-link"></span></a>' : '';

            var cityHtml = city;
            if (address) {
                cityHtml = '<a target="_blank" href="https://maps.google.com/?q='+encodeURIComponent(address)+'">' + city + ' <span class="fa fa-external-link"></span></a>';
            }

            var html = '';
            html += '<tr data-type="'+typeSlug+'">';
            var logoHtml = '';
            if (logo) {
                logoHtml = '<img src="'+logo+'" class="logo" />';
            }

            var columnClass = isUnitedStates ? 'col-md-4' : 'col-md-3';

            html += '<td class="' + columnClass + ' col-company">' + logoHtml + company + '</td>';
            if (!isUnitedStates) {
                html += '<td class="' + columnClass + ' col-url" style="word-wrap: break-word;">' + websiteHtml + '</td>';
            }
            html += '<td class="' + columnClass + ' col-city">' + cityHtml + '</td>';
            html += '<td class="' + columnClass + ' col-phone">' + phoneHtml + '</td>';

            html += '</tr>';

            return html;
        }

        function isUnitedStatesPath(path) {
            var shortName = $("#territory_0").find("option[value="+path[0]+"]").data('short-name');
            return shortName == 'US';
        }

        function renderTable(rows, typeSlug, path) {

            var isUnitedStates = isUnitedStatesPath(path);

            var html = '<table class="table">';

            var headers = [];
            var sizes = [];
            if (isUnitedStates) {
                headers = ["Company", "Location", "Phone"];
                sizes = ["col-md-4", "col-md-4", "col-md-4"];
            } else {
                headers = ["Company", "Website", "Location", "Phone"];
                sizes = ["col-md-3", "col-md-3", "col-md-3", "col-md-3"];
            }

            html += '<thead>';
            html += '<tr>';
            for (var k = 0; k < headers.length; k++) {
                var header = headers[k];
                var size = sizes[k];
                html += '<th class="' + size + '">' + header + '</th>';
            }
            html += '</tr>';
            html += '</thead>';

            for (var j = 0; j < rows.length; j++) {
                var row = rows[j];

                html += renderRow(row, typeSlug, isUnitedStates);

            }
            html += '</table>';

            return html;
        }

        function showFallback(id) {
            $("#rep-locator-results").empty();
            $('[data-fallback]').each(function() {
                var fallbackTermIds = $(this).data('fallback');
                for(var i=0;i<fallbackTermIds.length;i++) {
                    var fallbackTermId = fallbackTermIds[i];
                    if (fallbackTermId == id) {
                        $(this).removeClass('hidden');
                        return false;
                    }
                }
            });
        }

        function populateGrid(data, labels, path) {
            $("#rep-locator-results").empty();

            if (Array.isArray(data.results) && data.results.length == 0) {
                $("#rep-locator-results").html("<h4>Sorry, there are no channel partners in your region. Please contact Promethean using the <a href='/how-to-buy\'> How to Buy form</a> so we may help you further.</h4>");
                return;
            }

            var html = '';

            var types = data.types || {};
            var ordered = ['featured-partner', 'reseller', 'foundation-reseller', 'platinum-partner', 'gold-partner', 'silver-partner', 'distributor', 'featured-reseller', 'authorized-reseller', 'national-reseller', 'training-partner', 'national-partner'];

            for(var key in types){
                if (!types.hasOwnProperty(key))
                    continue;
                if (ordered.indexOf(key) == -1) {
                    ordered.push(key);
                }
            }

            html += '<h1 class="rep-header">' + labels.join('|') + '</h1>';

            if (Array.isArray(data.results)) {
                html += '<div class="rep-container">';

                html += renderTable(data.results, 'geo', path);

                html += '</div>';
            } else {
                for (var i = 0; i < ordered.length; i++) {
                    var key = ordered[i];
                    if (!types.hasOwnProperty(key))
                        continue;

                    var type = types[key];

                    html += '<div class="rep-container">';

                    html += '<h2 class="type-header ' + key + '">' + type.name + '</h2>';

                    var rows = data.results[type.slug];

                    html += renderTable(rows, type.slug, path);

                    html += '</div>';
                }
            }

            $("#rep-locator-results").html(html);
        }

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
        function debounce(func, wait, immediate) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        };

        var pendingAjaxRequest = null;

        function internalRefreshGrid() {
            if (pendingAjaxRequest && pendingAjaxRequest.abort) {
                pendingAjaxRequest.abort();
                pendingAjaxRequest = null;
            }

            // force all fallbacks to hide
            $(".fallback").addClass('hidden');

            var labels = [];
            var path = [];
            for (var i = 0; ; i++) {
                var container = $(".dropdown-level-" + i);
                if (container.length == 0)
                    break;

                var value = container.data('value');
                if (!value) {
                    break;
                }

                var option = container.find('select option:selected');
                if (option.data('fallback-to')) {
                    showFallback(value);
                    return;
                }
                var label = option.text();
                labels.push(label);
                path.push(value);
            }

            var resultsContainer = $("#rep-locator-results");

            if (path.length == 0) {
                resultsContainer.html(resultsContainer.data('empty-html'));
                resultsContainer.removeClass('hidden');
                return;
            }

            var spinner =
            '<div class="fusion-loading-container fusion-clearfix">' +
                '<div class="fusion-loading-spinner">' +
                '<div class="fusion-spinner-1"></div>' +
                '<div class="fusion-spinner-2"></div>' +
                '<div class="fusion-spinner-3"></div>' +
            '</div>';
            resultsContainer.html(spinner);
            resultsContainer.removeClass('hidden');

            var tier = null;

            var tierInput = $("input[name='representative_tiers']:checked");
            var servicesInput = $("input[name='representative_services']:checked");

            if (tierInput.closest('[data-country]').is(':visible')) {
                tier = tierInput.val();
            }

            var services = servicesInput.map(function(){ return $(this).val(); }).get();

            var latitude = parseFloat($("#geo-latitude").val());
            latitude = isNaN(latitude) ? null : latitude;
            var longitude = parseFloat($("#geo-longitude").val());
            longitude = isNaN(longitude) ? null : longitude;

            pendingAjaxRequest = $.ajax({
                type: 'POST',
                data: {
                    action: 'rep_locator_search',
                    parents: path,
                    tier: tier,
                    services: services,
                    latitude: latitude,
                    longitude: longitude
                },
                url: rep_locator_config.ajax_url,
                success:function(response) {
                    pendingAjaxRequest = null;
                    populateGrid(response, labels, path);
                }
            });
        }

        var refreshGrid = debounce(internalRefreshGrid, 500);

        function handleSelectChange(select, skipRefresh, resetGeo) {
            var container = $(select).parents('.dropdown-level');

            var thisValue = $(select).val();
            var thisLevel = container.data('level');

            container.data('value', thisValue);

            if (thisLevel == 0) {
                $("[data-country]").each(function(){
                    if ($(this).data('country') == thisValue) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            }

            for(var i=thisLevel+1;;i++) {
                var childContainer = $(".dropdown-level-" + i);
                if (childContainer.length == 0)
                    break;

                childContainer.data('value', null);
                childContainer.find('select').val(null);

                if (childContainer.data('parent') == thisValue) {
                    childContainer.show();
                } else {
                    childContainer.hide();
                }
            }

            if (resetGeo) {
                $(".rep-search-bar").val('');
                $("#geo-latitude").val('');
                $("#geo-longitude").val('');
            }

            if (!skipRefresh) {
                refreshGrid();
            }
        }

        function handleRadioChange(radio) {
            radio = $(radio);
            var id = radio.attr('id');

            radio.closest('div').find('.fa.fa-fw').removeClass('fa-check-circle-o').addClass('fa-circle-o');
            $("label[for='"+id+"'").find('.fa.fa-fw').removeClass('fa-circle-o').addClass('fa-check-circle-o');

            refreshGrid();
        }

        function handleCheckboxChange(checkbox) {
            checkbox = $(checkbox);
            var id = checkbox.attr('id');

            var icon = $("label[for='"+id+"'").find('.fa.fa-fw');

            if (checkbox.is(':checked')) {
                icon.removeClass('fa-square-o').addClass('fa-check-square-o');
            } else {
                icon.removeClass('fa-check-square-o').addClass('fa-square-o');
            }

            refreshGrid();
        }

        function handleAddressChange(place) {
            var country = null;
            var state = null;

            if (place) {
                if (place.geometry && place.geometry.location) {
                    $("#geo-latitude").val(place.geometry.location.lat);
                    $("#geo-longitude").val(place.geometry.location.lng);
                } else {
                    $("#geo-latitude").val('');
                    $("#geo-longitude").val('');
                }
                var components = place.address_components;
                for (var i = 0; i < components.length; i++) {
                    var component = components[i];
                    for (var j = 0; j < component.types.length; j++) {
                        var type = component.types[j];
                        switch (type) {
                            case 'country':
                                country = component;
                                break;
                            case 'administrative_area_level_1':
                                state = component;
                                break;
                        }
                    }
                }
            } else {
                $("#geo-latitude").val('');
                $("#geo-longitude").val('');
            }

            var countryList = $(".dropdown-level-0 select");

            var countryValue = null;
            if (country) {
                countryValue = countryList.find('option[data-short-name="' + country.short_name + '"]').attr('value');
            }
            countryList.val(countryValue);

            var stateList = null;
            var triggerState = false;
            var stateValue = null;

            if (countryValue) {
                stateList = $(".dropdown-level[data-parent='" + countryValue + "'] select");
                if (stateList.length > 0) {
                    if (state) {
                        stateValue = stateList.find('option[data-short-name="' + state.short_name + '"]').attr('value');
                    }
                    triggerState = true;
                }
            }

            if (triggerState) {
                handleSelectChange(countryList[0], true, false);
                stateList.val(stateValue);
                handleSelectChange(stateList[0], false, false);
            } else {
                handleSelectChange(countryList[0], false, false);
            }
        }

        $(".rep-search-bar").each(function(){
            if (!window.google) {
                return;
            }
            var autocompleteOptions = { types: ['(cities)'] };
            var autocomplete = new google.maps.places.Autocomplete(this, autocompleteOptions);

            google.maps.event.addListener(autocomplete, 'place_changed', function () {
                var result = autocomplete.getPlace();

                if (result && result.geometry) {
                    handleAddressChange(result);
                }
            });
        });

        $(".dropdown-level select").on('change', function() {
            handleSelectChange(this, false, true);
        });

        $("input[name='representative_tiers']").on('change', function() {
           handleRadioChange(this);
        });

        $("input[name='representative_services']").on('change', function() {
            handleCheckboxChange(this);
        });

        var emptyHtml = $("#rep-locator-results").html();
        $("#rep-locator-results").data('empty-html', emptyHtml);

        $("[data-parent]:not([data-parent=''])").hide();


        var initialValue = $(".dropdown-level-0 select").val();
        if (initialValue) {
            handleSelectChange($(".dropdown-level-0 select"), false, true);
        }

        if (tippy) {
            tippy('.tippyize', {
                trigger: 'mouseenter focus click'
            });
        }
    });
})(jQuery);