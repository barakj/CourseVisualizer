
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

        function init(data) {
            var final = [];
            var counts = [0, 0, 0, 0, 0, 0];
            for (var course in data) {
                if (course.startsWith("CPSC") && data[course].degree === 'U') {
                    var node = {};
                    let year = data[course].id[0];
                    node.data = {
                        id: course,
                        name: course,
                        prereqs: data[course].prereqs,
                        prereqString: data[course]["prereq original"],
                        shortname: data[course]["shortname"],
                        longname: data[course]["longname"],
                        description: data[course]["description"],
                    };
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

        cy.on('click', 'node', function (evt) {
            let node = evt.target;
            let prereqs = node._private.data.prereqString !== null ? node._private.data.prereqString : "None"
            $('#overlay').show().on('click', hideOverlay);
            $('body').prepend(`<div id="popup"></div>`);
            let popup = $('#popup');
            popup.append(`<h2>${node._private.data.name}</h2>`)
                .append(`<h3>${node._private.data.longname}</h3>`)
                .append(`<p>Description: ${node._private.data.description}</p>`)
                .append(`<p>Prerequisits: ${prereqs}</p>`)
                .append(`<p>Dropdowns and such down here, but that will take more time</p>`)
        });

        function hideOverlay() {
            $('#overlay').off('click', hideOverlay).hide();
            $('#popup').remove();
        }

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

