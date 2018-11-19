function updateWindowPresets() {
    var presets = {
        fast_presets: [],
        all_presets: []
    };
    $(".presets_editor .fast-presets .preset-button").each(function(){
        presets.fast_presets.push(JSON.parse($(this).attr("preset")));
    });
    $(".presets_editor .presets-tab-content .tab-pane").each(function(){
        var preset_tab = {
            id: $(this).attr("preset-tab-id"),
            name: $(this).attr("preset-tab-name"),
            presets: []
        };
        $(this).find(".preset-button").each(function() {
            preset_tab.presets.push(JSON.parse($(this).attr("preset")));
        });
        presets.all_presets.push(preset_tab);
    });
    window.presets = presets;
    console.log(window.presets.all_presets);

    loadJSON("robot_address.json", function(response) {
        window_config = JSON.parse(response);
        saveJson(_config.json_save_url, _config.presets_save_path, JSON.stringify(window.presets));
	    window.operator_presets = window.presets;
        drawPresetsOperator();
    });
}

function buttonsActions() {
    $('.presets_editor .fast-presets .col-xs-4 .delete').unbind("click").click(function(){
        $(this).closest('.col-xs-4').remove();
        updateWindowPresets();
    });
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });
    $('.draggable').draggable({
        revert: true,
        handle: "div.drag"
    });
}

function tabsActions() {
    $('.presets_editor .presets-tab-content .tab-pane').droppable({
        drop: function(event, ui) {
            var preset = JSON.parse(ui.draggable.find("button").attr("preset"));
            $('.presets_editor .presets-tab-content .tab-pane .preset-button').each(function(){
                if($(this).attr('preset-id') == preset.id) {
                    $(this).closest('.col-xs-4').remove();
                }
            });
            addPresetButton(preset, '#'+event.target.id);
            updateWindowPresets();
            setHeights();
            buttonsActions();
        }
    });
    $('.presets_editor .delete-tab').unbind('click').click(function() {
        var tab_id = $(this).closest('a').attr('tab-id');
        $(".modal-delete .modal-message").text('Вы действительно хотите удалить "' + $('#preset-tab-'+tab_id).attr('preset-tab-name') + '"?');
        $(".modal-delete .modal-confirm").unbind('click').click(function() {
            $('#preset-tab-link-'+tab_id).remove();
            $('#preset-tab-'+tab_id).remove();

            updateWindowPresets();
            clearEditPreset();
            setHeights();
            $(".modal-delete").hide();
        });
        $(".modal-delete").show();
    });
}

function drawPresets() {
    $('#fast-presets').html('');
    $('.presets_editor .presets-tab').html('');
    $('.presets_editor .presets-tab-content').html('');

    $.each(window.presets.fast_presets, function(key, preset) {
        addPresetButton(preset, '#fast-presets');
    });
    var maxID = 0;
    $.each(window.presets.all_presets, function(key, tabPreset) {
        addPresetTab(key, tabPreset);
        $.each(tabPreset.presets, function(key, preset) {
            addPresetButton(preset, '#preset-tab-' + tabPreset.id);
            if(preset.id > maxID) {
                maxID = preset.id;
            }
        });
    });

    addPresetTabAdd();

    window.maxID = maxID;

    $('.presets_editor .preset-edit-form .preset-save').click(function(){
        if($('.presets_editor .preset-edit-form .preset').val()) {
            var preset = JSON.parse($('.presets_editor .preset-edit-form .preset').val());
            preset.name = $('.presets_editor .preset-edit-form .preset-name').val();
            preset.message = $('.presets_editor .preset-edit-form .preset-message').val();
            preset.cmd = $('.presets_editor .preset-edit-form .preset-cmd').val();
            preset.cmd_smile = $('.presets_editor .preset-edit-form .preset-smile').val();

            if (preset.message.search(/.*\/ */) !== -1) {
                preset.cmd = '/' + preset.message.replace(new RegExp(".*[\/]"), '');
                preset.message = preset.message.replace(new RegExp(preset.cmd), '');
                console.log("$ " + preset.message + "; " + preset.cmd);
            }

            $('.presets_editor .presets .preset-button').each(function () {
                if ($(this).attr('preset-id') == preset.id) {
                    var template =
                        "   <button class='btn btn-default col-xs-12 preset-button' preset-id='" + preset.id + "' preset='" + JSON.stringify(preset) + "' data-toggle='tooltip' data-placement='top' title='" + preset.message + "'>" +
                        "   <div class='ellipsis'>" +
                        "       <span class='msg_color'>" + preset.name + "</span>" +
                        "       <span class='cmd_color'>" + preset.cmd + "</span>" +
                        "   </div>";
                    if(preset.cmd_smile) {
                        template +=
                            "   <img src='" + preset.cmd_smile + "'>";
                    }
                    template +=
                        "   </button>" +
                        "   <div class='drag'><i class='fa fa-arrows'></i></div>" +
                        "   <div class='delete'><i class='fa fa-times'></i></div>";
                    $(this).parent().html(template);
                    $('.presets_editor .presets .preset-button').unbind('click').click(function(){
                        var preset = JSON.parse($(this).attr('preset'));
                        editPreset(preset);
                    });
                    buttonsActions();
                }
            });
            addLogMessage('update', preset.name);
        } else if($('.presets_editor .preset-edit-form .preset-name').val()) {
            var preset = {};
            preset.id = ++window.maxID;
            preset.name = $('.presets_editor .preset-edit-form .preset-name').val();
            preset.message = $('.presets_editor .preset-edit-form .preset-message').val();
            preset.cmd = $('.presets_editor .preset-edit-form .preset-cmd').val();
            preset.cmd_smile = $('.presets_editor .preset-edit-form .preset-smile').val();

            if (preset.message.search(/.*\/ */) !== -1) {
                preset.cmd = '/' + preset.message.replace(new RegExp(".*[\/]"), '');
                preset.message = preset.message.replace(new RegExp(preset.cmd), '');
                console.log("$ " + preset.message + "; " + preset.cmd);
            }

            //window.presets.push(preset);
            addPresetButton(preset);
            addLogMessage('new', preset.name);
        }
        buttonsActions();
        updateWindowPresets();
        clearEditPreset();
        setHeights();
    });

    $('.presets_editor .preset-edit-form .preset-delete').click(function(){
        if($('.presets_editor .preset-edit-form .preset').val()) {
            var curPreset = JSON.parse($('.presets_editor .preset-edit-form .preset').val());
            $(".modal-delete .modal-message").text('Вы действительно хотите удалить "' + curPreset.name + '"?');
            $(".modal-delete .modal-confirm").click(function(){
                $('.presets_editor .presets .preset-button').each(function () {
                    if ($(this).attr('preset-id') == curPreset.id) {
                        $(this).parent().remove();
                        console.log($(this));
                    }
                });
                addLogMessage('delete', curPreset.name);
                updateWindowPresets();
                clearEditPreset();
                setHeights();
                $(".modal-delete").hide();
            });
            $(".modal-delete").show();
        }
    });



    buttonsActions();
    tabsActions();
    $("#fast-presets").droppable({
        drop: function(event, ui) {
            var preset = JSON.parse(ui.draggable.find("button").attr("preset"));
            addPresetButton(preset, '#fast-presets');
            updateWindowPresets();
            setHeights();
            buttonsActions();
        }
    });

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        setHeights();
    });
}

function drawSmiles(smiles) {
    $.each(smiles, function(key, smile) {
        if(key == 0) {
            $(".presets_editor .smiles-pannel .selected-smile").html('<img src="' + smile.cmd_smile + '">');
        }
        $(".presets_editor .smiles-pannel .smiles").append('<div class="btn-smile" cmd="' + smile.cmd + '"><img src="' + smile.cmd_smile + '"></div>');
    });

    $(".presets_editor .smiles-pannel .smiles .btn-smile").hover(function(){
        $(".presets_editor .smiles-pannel .selected-smile").html('<img src="' + $(this).find('img').attr('src') + '">');
    });

    $(".presets_editor .smiles-pannel .smiles .btn-smile").click(function(){
        var message = $('.presets_editor .preset-edit-form .preset-message').val();
        console.log("@@@: " + message);
        if (message.search(/.*\/ */) !== -1) {
            var cmd = '/' + message.replace(new RegExp(".*[\/]"), '');
            message = message.replace(new RegExp(cmd), '');
            console.log("$ " + message + "; " + cmd);
            $('.presets_editor .preset-edit-form .preset-message').val(message + $(this).attr('cmd'));
        }

        $('.presets_editor .preset-edit-form .preset-cmd').val($(this).attr('cmd'));
        $('.presets_editor .preset-edit-form .preset-smile').val($(this).find('img').attr('src'));
        $('.presets_editor .preset-edit-form .insert_smile').html("<img src='" + $(this).find('img').attr('src') + "'>");
    });
}

function addPresetTabAdd() {
    $('.add-preset-tab').closest('li').remove();
    var template = "<li role='presentation'><a href='' class='add-preset-tab'><i class='fa fa-plus'></i></a></li>";
    $('.presets_editor .presets-tab').append(template);

    $('.presets-tab .add-preset-tab').unbind('click').click(function(e) {
        $(".modal-add-tab .modal-confirm").unbind('click').click(function() {
            addPresetTab(window.presets.all_presets.length, {
                "id": window.presets.all_presets.length,
                "name": $(this).closest('.modal-add-tab').find('.tab-name').val(),
                "presets": []
            });

            tabsActions();
            //$('.presets_editor .presets-tab-content .tab-pane').droppable({
            //    drop: function(event, ui) {
            //        var preset = JSON.parse(ui.draggable.find("button").attr("preset"));
            //        $('.presets_editor .presets-tab-content .tab-pane .preset-button').each(function(){
            //            if($(this).attr('preset-id') == preset.id) {
            //                $(this).closest('.col-xs-4').remove();
            //            }
            //        });
            //        addPresetButton(preset, '#'+event.target.id);
            //        updateWindowPresets();
            //        setHeights();
            //        buttonsActions();
            //    }
            //});

            addPresetTabAdd();

            updateWindowPresets();
            setHeights();
            $(".modal-add-tab").hide();
        });
        $(".modal-add-tab").show();
        return false;
    });
}

function addPresetTab(num, tabPreset) {
    var template = "<li role='presentation'";
    if(num == 0) {
        template += " class='active'";
    }
    template +=
        " id='preset-tab-link-" + tabPreset.id + "'>" +
        "   <a href='#preset-tab-" + tabPreset.id + "' tab-id='" + tabPreset.id + "' aria-controls='preset-tab-" + tabPreset.id + "' role='tab' data-toggle='tab'>" + tabPreset.name + "&nbsp;&nbsp;&nbsp;<i class='fa fa-times delete-tab'></i></a>" +
        "</li>";
    $('.presets_editor .presets-tab').append(template);

    var template = "<div role='tabpanel' class='tab-pane";
    if(num == 0) {
        template += " active ";
    }
    template +=
        "' id='preset-tab-" + tabPreset.id + "' preset-tab-id='" + tabPreset.id + "' preset-tab-name='" + tabPreset.name + "'></div>";
    $('.presets_editor .presets-tab-content').append(template);
}

function addPresetButton(preset, tabPreset) {
    var template =
        "<div class='col-xs-4 draggable'>" +
        "   <button class='btn btn-default col-xs-12 preset-button' preset-id='" + preset.id + "' preset='" + JSON.stringify(preset) + "' data-toggle='tooltip' data-placement='top' title='" + preset.message + "'>" +
        "   <div class='ellipsis'>" +
        "       <span class='msg_color'>" + preset.name + "</span>" +
        "       <span class='cmd_color'>" + preset.cmd + "</span>" +
        "   </div>";
    if(preset.cmd_smile) {
        template +=
            "   <img src='" + preset.cmd_smile + "'>";
    }
    template +=
        "   </button>" +
        "   <div class='drag'><i class='fa fa-arrows'></i></div>" +
        "   <div class='delete'><i class='fa fa-times'></i></div>" +
        "</div>";

    if(tabPreset) {
        $(tabPreset).append(template);
    } else {
        $('.presets_editor .presets-tab-content .tab-pane.active ').append(template);
    }

    $('.presets_editor .presets .preset-button').unbind('click').click(function(){
        var preset = JSON.parse($(this).attr('preset'));
        editPreset(preset);
    });
}

function clearEditPreset() {
    $('.presets_editor .preset-edit-form .preset').val("");
    $('.presets_editor .preset-edit-form .preset-name').val("");
    $('.presets_editor .preset-edit-form .preset-message').val("");
    $('.presets_editor .preset-edit-form .preset-cmd').val("");
    $('.presets_editor .preset-edit-form .preset-smile').val("");
    $('.presets_editor .preset-edit-form .insert_smile').html("");
}

function editPreset(preset) {
    $('.presets_editor .preset-edit-form .preset').val(JSON.stringify(preset));
    $('.presets_editor .preset-edit-form .preset-name').val(preset.name);
    $('.presets_editor .preset-edit-form .preset-message').val(preset.message + preset.cmd);
    $('.presets_editor .preset-edit-form .preset-cmd').val(preset.cmd);
    if(preset.cmd_smile) {
        $('.presets_editor .preset-edit-form .preset-smile').val(preset.cmd_smile);
        $('.presets_editor .preset-edit-form .insert_smile').html("<img src='" + preset.cmd_smile + "'>");
    } else {
        $('.presets_editor .preset-edit-form .preset-smile').val("");
        $('.presets_editor .preset-edit-form .insert_smile').html("");
    }
}

$(document).ready(function() {
    loadJSON("robot_address.json", function(response) {
        window.config = JSON.parse(response);

        // Загрузка пресетов
        loadJSON(window.config.presets_url, function(response) {
            console.log("presets: " + window.config.presets_url);
            window.presets = JSON.parse(response);
            drawPresets();
        });
        loadJSON(window.config.smiles_url, function(response) {
            console.log("smiles: " + window.config.presets_url);
            var smiles = JSON.parse(response);
            drawSmiles(smiles);
        });
    });
});