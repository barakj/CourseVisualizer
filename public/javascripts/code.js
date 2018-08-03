/**
 * APPROACHES OF VISUALIZATION/SPACING
 * First approach: constant spacing.
 * Second approach: centering columns.
 * Third approach: by course code (i.e. yxx, by xx).
 */


/* Keep track of intersecting edges */
let intersecting = [];
/* Keep track of courses names indexed by the course year */
let coursesByYear = [[],[],[],[],[],[],[]];
/* Keep track of already created nodes (objects), indexed by the course name */
let alreadyCreatedNodes = {};


/**
 * Parameters for spacing
 */

/**
 * Approach 1
 */

const params = {
    "x-start-1": 50,
    "x-interval": 300,
    "x-start-2": 350,
    "x-start-3": 650,
    "x-start-4": 950,
    "x-start-5": 1250,
    "x-start-6": 1550,
    "y-start": 50,
    "y-interval": 100
};

/**
 * Approach 3
 */

// const params = {
//     "x-start-1": 50,
//     "x-interval": 300,
//     "x-start-2": 350,
//     "x-start-3": 650,
//     "x-start-4": 950,
//     "x-start-5": 1250,
//     "x-start-6": 1550,
//     "y-start": 50,
//     "y-interval": 30
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
        let cy = window.cy = cytoscape({
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


        /**
         * CURVING ALL INTERSECTING EDGES
         */
        $(document).ready(function() {
            for(let conflictedEdge of intersecting) {
                cy.style().selector('#' + conflictedEdge.id).style({
                    "curve-style": "unbundled-bezier",
                    "control-point-distances": 100 * conflictedEdge.dir,
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
            let final = [];
            let counts = [0, 0, 0, 0, 0, 0];

            //only use if third approach
            let locationByCourseCode = getYForNodes(data);

            for (let course in data) {
                if (course.startsWith("CPSC") && data[course].degree === 'U') {
                    let node = {};
                    let year = data[course].id[0];
                    node.data = {id: course, name: course, prereqs: data[course].prereqs};
                    node.selected = false;

                    //first appraoch
                    node.position = {
                        x: params["x-start-" + year],
                        y: params["y-start"] + params["y-interval"] * counts[year - 1]
                    };

                    //third approach
                    // let courseCode = course.slice(-2);
                    // node.position = {
                    //     x: params["x-start-" + year],
                    //     y: locationByCourseCode[courseCode]
                    // };

                    counts[year - 1]++;
                    coursesByYear[year - 1].push(course);
                    final.push(node);
                    alreadyCreatedNodes[course] = node;
                    if (node.data.prereqs) {
                        final.push(...makeAllEdges(node));
                    }
                }
            }
            console.log(final);
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
            console.log("fixing overlap");
            fixOverlap(sourceNode, targetNode);
            let obj = {data:{id: sourceNode + targetNode, target: targetNode, source: sourceNode}, group: "edges"};
            if (isOptional) {
                obj.classes = "optional";
            }
            return obj;
        }

        function fixOverlap(prereq, course) {
            if(alreadyCreatedNodes[prereq] && alreadyCreatedNodes[course]) {
                let xCourse = alreadyCreatedNodes[course].position.x;
                let yCourse = alreadyCreatedNodes[course].position.y;
                let xPrereq = alreadyCreatedNodes[prereq].position.x;
                let yPrereq = alreadyCreatedNodes[prereq].position.y;

                let testX = (xPrereq + xCourse) / 2;
                let testY = (yPrereq + yCourse) / 2;
                if ((testX - params["x-start-1"]) % params["x-interval"] === 0) {
                    //if got here, could be intersecting
                    console.log(course + " and " + prereq + " might be intersecting a node");
                    //figure out which year the intersected node could be part of
                    let courseYear = 0;
                    let copyX = testX;
                    while (copyX > params["x-start-1"]) {
                        copyX -= params["x-interval"];
                        courseYear++;
                    }

                    //now, iterate over all the nodes that could be intersected based on the year.
                    //for each node, check whether the y value of the source and target nodes average overlaps the node.
                    for (let current of coursesByYear[courseYear]) {
                        let middleOfNodeY = alreadyCreatedNodes[current].position.y;
                        let middleOfNodeX = alreadyCreatedNodes[current].position.x;
                        //TODO: get half the size of the node's height and width without using a hardcoded value
                        //TODO: the greater the Y difference, the greater the pull should be (not just 1,-1)
                        if (isInBox(testX, testY, middleOfNodeX, middleOfNodeY, 65.25, 24)) {
                            //if got here, edge from source to target overlaps an existing node.
                            //add the conflicting edge to the array and decide on direction of curve (-1 or 1).
                            console.log(course + " and " + prereq + " have an edge that intersects a node");
                            intersecting.push({
                                id: prereq + course,
                                dir: (yPrereq >= testY || xPrereq === testX ? 1 : -1)
                            });
                            break;
                        }
                    }
                }
            }
        }

            /**
             * method to check whether a certain y value intersects a circle centered at some other y value.
             * @param y the y value of the point to test.
             * @param x the x value of the point to test.
             * @param yCenter the y value of the center of the node.
             * @param xCenter the x value of the center of the node.
             * @param width width of the node.
             * @param height height of the node.
             * @returns {boolean}
             */
            function isInBox(x, y, xCenter, yCenter, width, height) {
                let bottom = yCenter + height / 2;
                let top = yCenter - height / 2;
                let left = xCenter - width / 2;
                let right = xCenter + width / 2;
                return y >= top && y <= bottom && x >= left && x <= right;
            }

            function getYForNodes(data) {
                let val = params["y-start"];
                let final = {};
                let map = [... new Set(Object.keys(data).map((x) => {
                    return x.slice(-2)
                }).sort())];
                for (let key of map) {
                    final[key] = val;
                    val += params["y-interval"];
                }
                return final;
            }

            cy.on('cxttap', 'node', function (evt) {
                let node = evt.target;
                attemptSelection(node);
            });

            function attemptSelection(node) {
                let good = true;
                node.connectedEdges("[target = \"" + node.id() + "\"]").forEach(function (current, i, all) {
                    console.log(current.id());
                    if (!current.selected()) {
                        good = false;
                    }
                });
                if (good) {
                    node.select();
                    node.connectedEdges("[source = \"" + node.id() + "\"]").forEach(function (current, i, all) {
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
                //node.outgoers('edge').removeClass('hovered');
            }

            function hoverBack(node) {
                node.predecessors('edge').addClass('hovered');
                //node.outgoers('edge').addClass('hovered');
            }
        });


