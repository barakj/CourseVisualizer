
var params = {
    "y-start-1": 50,
    "y-start-2": 350,
    "y-start-3": 650,
    "y-start-4": 950,
    "x-start": 50,
    "x-interval": 100
}

Promise.all([
    fetch('javascripts/cy-style.json', {mode: 'no-cors'})
        .then(function(res) {
            return res.json()
        }),
    fetch('javascripts/data.json', {mode: 'no-cors'})
        .then(function(res) {
            return res.json()
        })
])
    .then(function(dataArray) {
        var cy = window.cy = cytoscape({
            container: document.getElementById('main2'),

            boxSelectionEnabled: false,
            autounselectify: false,
            autoungrabify: true,
            maxZoom: 2,
            minZoom: 0.5,

            elements: init(dataArray[1]),

            layout: {
                name: 'preset'
            },

            style: dataArray[0]
        });

        $(document).ready(function(){
            cy.$('node').qtip({
                content: {
                    text: function(event, api) {
                        let id = this.id;
                        $.ajax({
                            url: '/tooltip/' + this._private.data.id, // URL to the JSON file
                            type: 'GET', // POST or GET
                            dataType: 'json', // Tell it we're retrieving JSON
                        }).then(function(data) {
                            /* Process the retrieved JSON object
                             *    Retrieve a specific attribute from our parsed
                             *    JSON string and set the tooltip content.
                             */

                            // Now we set the content manually (required!)

                            api.set('content.text', "<b>" + data.content + "</b>");
                        }, function(xhr, status, error) {
                            // Upon failure... set the tooltip content to the status and error value
                            api.set('content.text', status + ': ' + error);
                        });
                        return 'Loading...'; // Set some initial loading text
                    }
                },
                position: {
                    my: 'top center',
                    at: 'bottom center'
                },
                style: {
                    classes: 'qtip-bootstrap',
                    tip: {
                        width: 16,
                        height: 8
                    }
                }
            })});

        function init(data) {
            var final = [];
            var counts = [0, 0, 0, 0];
            for (var node in data) {
                var obj = {};
                obj.data = {id:node};
                obj.selected = false;
                obj.position = {
                    x: params["y-start-" + data[node].year],
                    y: params["x-start"] + params["x-interval"] * counts[data[node].year - 1]
                };
                counts[data[node].year - 1]++;
                final.push(obj);
                for (var prereq of getAllPrereqs(data[node].prereqs)) {
                    final.push({data:{id: prereq + node, target: node, source: prereq}, group:"edges"});
                }
            }
            console.log(final);
            return final;
        }

        function getAllPrereqs(arr) {
            var final = [];
            for (var option of arr) {
                var key = Object.keys(option)[0];
                if (key === "course") {
                    final.push(option[key]);
                } else {
                    final = final.concat(getAllPrereqs(option[key]));
                }
            }
            return final;
        }

        cy.on('cxttap', 'node', function(evt){
            var node = evt.target;
            attemptSelection(node);
        });

        function attemptSelection(node) {
            var good = true;
            node.connectedEdges("[target = \"" + node.id() + "\"]").forEach(function(current, i, all) {
                console.log(current.id());
                if (!current.selected()) {
                    good = false;
                }
            });
            if (good) {
                node.select();

                node.connectedEdges("[source = \"" + node.id() + "\"]").forEach(function(current, i, all) {
                    current.select();
                })
            }
        }
    });

