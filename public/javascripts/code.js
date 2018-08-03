let conflicting = [];

var params = {
    "x-start-1": 50,
    "x-interval": 300,
    "x-start-2": 350,
    "x-start-3": 650,
    "x-start-4": 950,
    "y-start": 50,
    "y-interval": 100
};

/**
 * paramters for the third approach for reference
 */
// var params = {
//     "x-start-1": 50,
//     "x-interval": 300,
//     "x-start-2": 350,
//     "x-start-3": 650,
//     "x-start-4": 950,
//     "y-start": 50,
//     "y-interval": 70
// };
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

        /**
         * CURVING ALL CONFLICTING EDGES
         */
        $(document).ready(function() {
            console.log(conflicting);
            for(let conflictedEdge of conflicting) {
                cy.style().selector('#' + conflictedEdge.id).style({
                    "curve-style": "unbundled-bezier",
                    "control-point-distances": 50 * conflictedEdge.dir,
                    "control-point-weights": 0.5
                }).update();
            }

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
            let createdNodes = {};
            let final = [];
            let counts = [0, 0, 0, 0];
            let coursesByYear = [[],[],[],[],[]];

            //only use if third approach
            // let locationByCourseCode = getYForNodes(data);

            for (let node in data) {
                let obj = {};
                let year = data[node].year;
                obj.data = {id:node};
                obj.selected = false;

                //first option
                obj.position = {
                    x: params["x-start-" + year],
                    y: params["y-start"] + params["y-interval"] * counts[year - 1]
                };

                //third option
                // let courseCode = node.slice(-2);
                // obj.position = {
                //     x: params["x-start-" + year],
                //     y: locationByCourseCode[courseCode]
                // };

                counts[year - 1]++;
                coursesByYear[year - 1].push(node);
                final.push(obj);
                createdNodes[node] = obj;
                console.log(createdNodes);
                for (let prereq of getAllPrereqs(data[node].prereqs)) {
                    //need to check whether prereq -> node would intersect an existing node
                    if(createdNodes[prereq]) {
                        let testX = (createdNodes[prereq].position.x + obj.position.x) / 2;
                        let testY = (createdNodes[prereq].position.y + obj.position.y) / 2;
                        if ((testX - params["x-start-1"]) % params["x-interval"] === 0) {
                            //if got here, could be intersecting
                            console.log(node + " and " + prereq + " might be intersecting a node");
                            //figure out which year the intersected node could be part of
                            let courseYear = 0;
                            let copyX = testX;
                            while (copyX > params["x-start-1"]) {
                                copyX -= params["x-interval"];
                                courseYear++;
                            }

                            //now, iterate over all the nodes that could be intersected based on the year.
                            //for each node, check whether the y value of the source and target nodes average overlaps the node.
                            for(let current of coursesByYear[courseYear]) {
                                let middleOfNode = createdNodes[current].position.y;
                                //TODO: get half the size of the node's height without using a hardcoded value
                                //TODO: the greater the Y difference, the greater the pull should be (not just 1,-1)
                                if(isInCircle(testY, middleOfNode,15)){
                                    //if got here, edge from source to target overlaps an existing node.
                                    //add the conflicting edge to the array and decide on direction of curve (-1 or 1).
                                    conflicting.push({id:prereq + node, dir:(createdNodes[prereq].position.y  >= testY ? 1 : -1)});
                                } else if(createdNodes[prereq].position.x === testX) {
                                    //if got here, same x coordinates so definitely intersecting nodes.
                                    conflicting.push({id:prereq + node, dir:1});
                                }
                            }
                        }
                    }
                    final.push({data:{id: prereq + node, target: node, source: prereq}, group:"edges"});
                }
            }
            console.log(final);
            return final;
        }

        /**
         * method to check whether a certain y value intersects a circle centered at some other y value.
         * @param y the y value of the point to test
         * @param yMiddle the y value of the center of the circle
         * @param radius the radius of the circle
         * @returns {boolean}
         */
        function isInCircle(y, yCenter, radius) {
            let bottom = yCenter + radius;
            let top = yCenter - radius;
            return y >= top && y <= bottom;
        }

        function getYForNodes(data) {
            let val = params["y-start"];
            let final = {};
            let map = [... new Set(Object.keys(data).map((x) => {return x.slice(-2)}).sort())];
            for (let key of map) {
                final[key] = val;
                val += params["y-interval"];
            }
            return final;
        }

        function getAllPrereqs(arr) {
            let final = [];
            for (let option of arr) {
                let key = Object.keys(option)[0];
                if (key === "course") {
                    final.push(option[key]);
                } else {
                    final = final.concat(getAllPrereqs(option[key]));
                }
            }
            return final;
        }

        cy.on('cxttap', 'node', function(evt){
            let node = evt.target;
            attemptSelection(node);
        });

        function attemptSelection(node) {
            let good = true;
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

        cy.on('mouseover', 'node', function (evt) {
            let node = evt.target;
            hoverBack(node);
        });

        cy.on('mouseout', 'node', function (evt) {
            let node = evt.target;
            unHoverBack(node);
        });

        function unHoverBack(node) {
            node.predecessors('edge').removeClass('hovered');
        }

        function hoverBack(node) {
            node.predecessors('edge').addClass('hovered');
        }

    });

