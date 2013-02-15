var CirklonAllowedCharacters = "[-A-Za-z0-9()#. $@!&+{}*]";
var CirklonEmpty = 'Empty';
var CirklonMidiCC = 'MIDI CC';
var CirklonTrackCtrl = 'Track CTRL';


var Control = function() {
    var self = this;
    self.name = ko.observable('');
    self.cc = ko.observable('');
    self.trackValue = ko.observable('');
    self.option = ko.observable(CirklonEmpty);

    self.displayName = ko.computed({
        read: function() {
            if (self.option() == CirklonEmpty)
                return '';
            else if (self.option() == CirklonMidiCC && self.cc().length != '')
                return self.name();
            else if (self.option() == CirklonTrackCtrl)
                return 'CTRL';
            else
                return 'Unknown';

        },
        deferEvaluation: true
    });

    self.displayAction = ko.computed({
        read: function() {
            if (self.option() == CirklonEmpty)
                return '';
            else if (self.option() == CirklonMidiCC)
                return 'cc: #' + self.cc();
            else if (self.option() == CirklonTrackCtrl)
                return self.trackValue();
            else
                return 'Unknown';
        },
        deferEvaluation: true
    });

    self.isValid = ko.computed({
        read: function() {
            if (self.option() == CirklonEmpty)
                return true;
            else if (self.option() == CirklonMidiCC)
                return self.isNameValid() && self.isCCValid();
            else if (self.option() == CirklonTrackCtrl)
                return self.isTrackValueValid();
            else
                return 'Unknown';
            
        }
    });

    self.isNameValid = ko.computed({
        read: function() {
            var regex = new RegExp('^' + CirklonAllowedCharacters + '{0,6}$');
            return regex.test(self.name());
        },
        deferEvaluation: true
    });

    self.isCCValid = ko.computed({
        read: function() {
            var regex = new RegExp('^([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-7])$');
            return regex.test(self.cc());
        },
        deferEvaluation: true
    });

    self.isTrackValueValid = ko.computed({
        read: function() {
            return self.trackValue().length > 0;
        },
        deferEvaluation: true
    });
    

    self.copyValuesFrom = function(otherControl) {
        self.name(otherControl.name());
        self.cc(otherControl.cc());
        self.trackValue(otherControl.trackValue());
        self.option(otherControl.option());
    }
};

var ViewModel = function() {
    var self = this;
    
    var controls = [];
    for (var i = 1; i <= 96; i++) {
        controls.push(new Control());
    }

    self.controls = ko.observableArray(controls);
    self.editControl = ko.observable(null);
    self.selectedControl = ko.observable(null);

    self.instruments = ko.observableArray([]);
    self.selectedInstrument = ko.observable('');
    self.name = ko.observable('');
    self.midiPort = ko.observable('');
    self.midiChannel = ko.observable('');
    self.multi = ko.observable(false);
    self.controlOptions = ko.observableArray([CirklonEmpty, CirklonMidiCC, CirklonTrackCtrl]);
    self.trackValues = ko.observableArray(['pgm', 'quant%', 'note%', 'noteC', 'velo%', 'veloC', 'leng%', 'tbase', 'octave', 'knob1', 'knob2']);

    self.isNameValid = ko.computed({
        read: function() {
            var regex = new RegExp('^' + CirklonAllowedCharacters + '{1,9}$');
            return regex.test(self.name());
        },
        deferEvaluation: true
    });

    self.isMidiPortValid = ko.computed({
        read: function() {
            var regex = new RegExp('^[1-6]$');
            return regex.test(self.midiPort());
        },
        deferEvaluation: true
    });

    self.isMidiChannelValid = ko.computed({
        read: function() {
            var regex = new RegExp('^([1-9]|1[0-6])$');
            return regex.test(self.midiChannel());
        },
        deferEvaluation: true
    });

    self.isValid = ko.computed({
        read: function() {
            return self.isNameValid() && self.isMidiPortValid() && self.isMidiChannelValid();
        }
    });

    self.edit = function(control) {
        var editControl = new Control();
        editControl.copyValuesFrom(control);
        self.editControl(editControl);
        self.selectedControl(control);
    }

    self.save = function() {
        self.selectedControl().copyValuesFrom(self.editControl());
        self.selectedControl(null);
        self.editControl(null);
    }

    self.cancel = function() {
        self.selectedControl(null);
        self.editControl(null);
    }

    self.upload = function(data, event) {
        var reader = new FileReader();
        var files = event.delegateTarget.files;
        if (files.length < 1)
            return;

        reader.onload = function(e) {
            self.instrumentJSON = JSON.parse(e.target.result);
            var instruments = Object.keys(self.instrumentJSON.instrument_data);
            self.instruments(instruments);
            $('#importModal').modal();
        }
        reader.readAsText(files[0]);
        
    }

    self.importInstrument = function() {
        self.name(self.selectedInstrument());
        var instrument = self.instrumentJSON.instrument_data[self.selectedInstrument()];
        self.midiPort(instrument['midi_port']);
        self.midiChannel(instrument['midi_chan']);
        self.multi(false);
        if (instrument['multi'])
            self.multi(instrument['multi']);
        var track_values = instrument['track_values'];

        var controls = [];
        for (var i = 1; i <= 96; i++) {
            var control = new Control();

            var slot_name = 'slot_' + i;
            if (slot_name in track_values) {
                var slot = track_values[slot_name];
                var slot_keys = Object.keys(slot);
                if (slot_keys.indexOf('label') > -1) {
                    control.name(slot['label']);
                }
                if (slot_keys.indexOf('MIDI_CC') > -1) {
                    control.cc(slot['MIDI_CC']);
                    control.option(CirklonMidiCC);
                }
                if (slot_keys.indexOf('track_control') > -1) {
                    control.trackValue(slot['track_control']);
                    control.option(CirklonTrackCtrl);
                }
            }

            controls.push(control);
        }
        self.controls(controls);
        self.instrumentJSON = null;
        self.instruments([]);
        self.selectedInstrument('');
        $('#uploadForm')[0].reset();
    }

    self.exportInstrument = function() {
        var jTrackValues = {};
        $.each($('.control'), function(index, value) {
            var control = ko.dataFor(value);
            if (control.option() != CirklonEmpty) {
                var key = 'slot_' + (index + 1);
                jTrackValues[key] = {}
                if (control.option() == CirklonMidiCC) {
                    jTrackValues[key]['MIDI_CC'] = parseInt(control.cc());
                    if (control.name() != '') {
                        jTrackValues[key]['label'] = control.name();
                    }
                }
                else if (control.option() == CirklonTrackCtrl) {
                    jTrackValues[key]['track_control'] = control.trackValue();
                }
            }
        });

        var jInstrument = {};
        jInstrument['midi_port'] = self.midiPort();
        jInstrument['midi_chan'] = parseInt(self.midiChannel());
        if (self.multi())
            jInstrument['multi'] = true;
        jInstrument['track_values'] = jTrackValues;

        var jOutput = { instrument_data: {} };
        jOutput['instrument_data'][self.name()] = jInstrument;

        var sOutput = JSON.stringify(jOutput, null, 4);
        //console.log(sOutput);

        var blob = new Blob([sOutput], { 'type': 'text\/plain;charset=' + document.characterSet });
        window.saveAs(blob, self.name() + '.cki');
    }
};

ko.bindingHandlers.fadeVisible = {
    init: function(element, valueAccessor) {
        // Initially set the element to be instantly visible/hidden depending on the value
        var value = valueAccessor();
        $(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function(element, valueAccessor) {
        // Whenever the value subsequently changes, slowly fade the element in or out
        var value = valueAccessor();
        ko.utils.unwrapObservable(value) ? $(element).fadeIn() : $(element).fadeOut();
    }
};

$(document).ready(function() {
    for (var i = 1; i <= 16; i++) {
        $('#numbers').append('<li>' + i + '</li>');
    }
    $('#controls').sortable();
    ko.applyBindings(new ViewModel());

    if (!(navigator.userAgent.search("Chrome") >= 0 || navigator.userAgent.search("Firefox") >= 0)) {
        $('#browserWarningModal').modal();
    }
});

