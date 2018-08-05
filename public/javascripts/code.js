let globalData;
let globalStyle;

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
        globalData = dataArray[1];
        globalStyle = dataArray[0];
    });

$(document).ready(function () {
    $('#department-button').on('click', function () {
        init($('#department-select').val());
    });

    function init(dept) {
        var cy = window.cy = cytoscape({
            container: document.getElementById('cyto'),

            boxSelectionEnabled: false,
            autounselectify: false,
            autoungrabify: true,
            maxZoom: 1.5,
            minZoom: 0.5,
            wheelSensitivity: 0.5,

            elements: makeGraph(dept),

            layout: {
                name: 'preset',
                fit: false,
                pan: { x: 100, y: 0 },
                zoom: 1.5
            },

            style: globalStyle
        });

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
            let prereqs = (node._private.data.prereqString !== null) ? node._private.data.prereqString : "None";
            $('#overlay').show().on('click', hideOverlay);
            $('#main').prepend(`<div id="popup"></div>`);
            let popup = $('#popup');
            popup.append(`<div class="card">
            <div class="title">
                <h2>${node._private.data.name}</h2>
                <h3>${node._private.data.longname}</h3>
            </div>
            <div class="text">
                ${node._private.data.description} <br> <br>
                ${prereqs} <br> <br>
                more stuff
            </div>

            <div class="action">
                actions
            </div>
        </div>`);
        });
    }

    function makeGraph(dept) {
        var final = [];
        var counts = [0, 0, 0, 0, 0, 0];
        for (var course in globalData) {
            if (course.startsWith(dept) && globalData[course].degree === 'U') {
                var node = {};
                let year = globalData[course].id[0];
                node.data = {
                    id: course,
                    name: course,
                    prereqs: globalData[course].prereqs,
                    prereqString: globalData[course]["prereq original"],
                    shortname: globalData[course]["shortname"],
                    longname: globalData[course]["longname"],
                    description: globalData[course]["description"],
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

});