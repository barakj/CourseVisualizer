
var params = {
    "x-start-1": 50,
    "x-start-2": 350,
    "x-start-3": 650,
    "x-start-4": 950,
    "x-start-5": 1250,
    "x-start-6": 1550,
    "y-start": 50,
    "y-interval": 100
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
            maxZoom: 1.5,
            minZoom: 0.5,
            wheelSensitivity: 0.5,

            elements: init(dataArray[1]),

            layout: {
                name: 'preset',
                fit: false,
                pan: { x: 200, y: 0 },
                zoom: 1.5
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
            var counts = [0, 0, 0, 0, 0, 0];
            for (var course in data) {
                if (course.startsWith("CPSC") && data[course].degree === 'U') {
                    var node = {};
                    let year = data[course].id[0];
                    node.data = {id: course, name: course, prereqs: data[course].prereqs};
                    node.selected = false;
                    node.position = {
                        x: params["x-start-" + year],
                        y: params["y-start"] + params["y-interval"] * counts[year - 1]
                    };
                    counts[year - 1]++;
                    final.push(node);
                    if (node.data.prereqs) {
                        final.push(...makeAllEdges(node));
                    }
                }
            }
            return final;
        }

        function makeAllEdges(node) {
            let id = node.data.id;
            let prereqs = node.data.prereqs;
            return makeEdgesRecursive(id, prereqs);
        }

        function makeEdgesRecursive(targetNode, prereqObj) {
            let key = Object.keys(prereqObj)[0];
            switch (key) {
                case "either":
                    return makeEdgesRecursive(targetNode, prereqObj[key][0]);
                case "and":
                    let final = [];
                    for (let sub of prereqObj[key]) {
                        final.push(...makeEdgesRecursive(targetNode, sub));
                    }
                    return final;
                case "all":
                case "only":
                    return prereqObj[key].map((x) => {return makeEdge(targetNode, false, x)});
                default:
                    return prereqObj[key].map((x) => {return makeEdge(targetNode, true, x)});
            }
        }

        function makeEdge(targetNode, isOptional, sourceNode) {
            let obj = {data:{id: sourceNode + targetNode, target: targetNode, source: sourceNode}, group: "edges"};
            if (isOptional) {
                obj.classes = "optional";
            }
            return obj;
        }

        cy.on('cxttap', 'node', function(evt){
            var node = evt.target;
            attemptSelection(node);
        });

        cy.on('mouseover', 'node', function (evt) {
            let node = evt.target;
            node.predecessors('edge').addClass('hovered');
            node.outgoers('edge').addClass('hovered');
        });

        cy.on('mouseout', 'node', function (evt) {
            let node = evt.target;
            node.predecessors('edge').removeClass('hovered')
            node.outgoers('edge').removeClass('hovered');
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

