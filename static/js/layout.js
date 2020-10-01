class Layout {

  constructor(main_input_id, acdh_data_url) {
    this.DOCS_INDEX = {}
    this.DATA = {};
    this.FILTERED_DATA = {};

    this.COLORS = {"1":{"value":"#E85F63","assigned":false},"2":{"value":"#E8B15F","assigned":false},"merge":{"value":"#FF9F76","assigned":true}}
    this.main_input = document.getElementById(main_input_id);
    this.acdh_data_url = acdh_data_url;
    this.autocomplete_list = [];


    //Q1 Data
    this.Q1 = {
          data: null,
          index_set: {},
          default_color: "#C4C4C4",
          barchart_data: {x:[],y:[]}
     };
     //Q2 Data
     this.Q2 = {
        index_set: {"nodes":{},"edges":{}, "max_node_weight": -1},
        cy: null,
        cy_data: {nodes:[],edges:[],highlighted:{}},
        node_default_color: "#C4C4C4",
        edge_default_color: '#DBDBDB'
     };
  }

  init_interface(){

    /*INNER utility functions*/
    function __l_clone(l) {
      var clone = [];
      for (var i = 0; i < l.length; i++) {
        clone.push(JSON.parse(JSON.stringify(l[i])));
      }
      return clone;
    }

    var class_instance = this;
    /*Build the Autocomplete input box*/
    var autocomplete_list = [];
    var autocomplete_list_ids = [];

    run();

    function run() {
      $.ajax({
              type: "GET",
              url: class_instance.acdh_data_url+"res/dh_in_crossref_min.json",
              dataType: "json",
              async: true,
              error: function() {alert("An error has occured while getting the data");},
              success: function(d_cr) {
                  class_instance.DOCS_INDEX = d_cr;
                  //console.log(class_instance.DOCS_INDEX);
                  $.ajax({
                          type: "GET",
                          url: class_instance.acdh_data_url+"acdh/institutions.json",
                          dataType: "json",
                          async: true,
                          error: function() {alert("An error has occured while getting the data");},
                          success: function(d1) {
                            for (var i = 0; i < d1.length; i++) {
                              init_institution(d1[i]);
                            }
                            $.ajax({
                                    type: "GET",
                                    url: class_instance.acdh_data_url+"acdh/courses.json",
                                    dataType: "json",
                                    async: true,
                                    error: function() {alert("An error has occured while getting the data");},
                                    success: function(d2) {
                                      for (var i = 0; i < d2.length; i++) {
                                        if ("institution" in d2[i]){
                                          init_course(d2[i]["institution"]["id"], d2[i]);
                                        }
                                      }

                                      $.ajax({
                                              type: "GET",
                                              url: class_instance.acdh_data_url+"res/affiliation.json"+"?time="+(new Date().getTime()).toString(),
                                              dataType: "json",
                                              async: true,
                                              success: function(d3) {
                                                for (var doi_k in d3) {
                                                  var doi_obj = d3[doi_k];
                                                  doi_obj["id"] = doi_k;
                                                  for (var i = 0; i < doi_obj["acdh_aff"].length; i++) {
                                                    var an_inst_id = doi_obj["acdh_aff"][i];
                                                    if (an_inst_id != -1){
                                                      init_doi(an_inst_id, doi_obj);
                                                    }
                                                  }
                                                }
                                                //console.log(class_instance.DATA);
                                                set_interface();
                                                set_views();
                                              }
                                        });
                                    }
                            });
                          }
                  });
            }
      });

      function init_institution(inst_obj){
        if (!(inst_obj["id"] in class_instance.DATA)) {
          class_instance.DATA[inst_obj["id"]] = JSON.parse(JSON.stringify(inst_obj));
          class_instance.DATA[inst_obj["id"]]["course"] = {};
          class_instance.DATA[inst_obj["id"]]["dois"] = {};
          class_instance.DATA[inst_obj["id"]]["techniques"] = {};
          autocomplete_list.push(inst_obj["name"].trim());
          autocomplete_list_ids.push(inst_obj["id"]);
        }
      }
      function init_course(inst_id, course_obj){
        var inst_course_obj = class_instance.DATA[inst_id];
        if (!(course_obj["id"] in inst_course_obj["course"])) {
            inst_course_obj["course"][course_obj["id"]] = JSON.parse(JSON.stringify(course_obj));
            if ("tadirah_techniques" in course_obj) {
              for (var i = 0; i < course_obj["tadirah_techniques"].length; i++) {
                course_obj["tadirah_techniques"][i]["name"] = course_obj["tadirah_techniques"][i]["name"].toString().trim();
                inst_course_obj["techniques"][course_obj["tadirah_techniques"][i]["id"]] = course_obj["tadirah_techniques"][i];
              }
            }
        }
      }
      function init_doi(inst_id, doi_obj) {
        var inst_course_obj = class_instance.DATA[inst_id];
        if (!(doi_obj["id"] in inst_course_obj["dois"])) {
          inst_course_obj["dois"][doi_obj["id"]] = JSON.parse(JSON.stringify(doi_obj));
        }
      }
    }

    function set_interface(){

      var colors_palette = class_instance.COLORS;

      main_input_autocomplete();
      /*set the onclick function for the add button*/
      function add_btn_onclick(){
        var input_box_val = document.getElementById("main_input").value.trim()
        var autocomplete_list_index = autocomplete_list.indexOf(input_box_val);
        if(autocomplete_list_index > -1){
          if (!($("#boxes_container .a-box").length >= 2)) {

            //assign a color
            var color_to_assign = "";
            var color_index = -1;
            for (var k in colors_palette) {
              if (colors_palette[k]["assigned"] == false) {
                color_to_assign = colors_palette[k]["value"];
                colors_palette[k]["assigned"] = true;
                color_index = k;
                break;
              }
            }
            $("#boxes_container").append('<div data-id="'+autocomplete_list_ids[autocomplete_list_index]+'" data-colorid="'+color_index+'" data-color="'+color_to_assign+'" class="a-box added" style="background-color:'+color_to_assign+'">'+input_box_val+'<div class="del-btn">X</div></div>');
          }

          if ($("#boxes_container .a-box").length == 2) {
            $("#boxes_container").append('<div class="a-box auto" data-id="merge" data-colorid="merge" style="background-color:'+colors_palette["merge"]["value"]+'">Both</div>');
          }

          // Check the added available boxes
          var added_ids = [];
          var added_colors = [];
          var combined = {};
          $("#boxes_container .a-box.added").each(function( index ) {
            added_ids.push($(this).attr("data-id"));
            added_colors.push($(this).attr("data-color"));
          });
          if($( "#boxes_container .a-box.auto" ).length > 0){
            $( "#boxes_container .a-box.auto" ).attr("data-id");
            combined["id"] = "merge";
            combined["color"] = colors_palette["merge"]["value"];
          }

          class_instance.update_q1("view", {ids: added_ids, combined: combined, colors: added_colors});
          class_instance.update_q2("view", {ids: added_ids, combined: combined, colors: added_colors});
        }

        $(".a-box.added .del-btn").on( "click", function () {
          colors_palette[$(this).parent().attr("data-colorid")]["assigned"] = false;
          $(this).parent().remove();
          if ($(".a-box.auto").length ) {
            $(".a-box.auto").remove();
          }

          // Check the added available boxes
          var added_ids = [];
          var added_colors = [];
          var combined = {};
          $("#boxes_container .a-box.added").each(function( index ) {
            added_ids.push($(this).attr("data-id"));
            added_colors.push($(this).attr("data-color"));
          });
          if($( "#boxes_container .a-box.auto" ).length > 0){
            $( "#boxes_container .a-box.auto" ).attr("data-id");
            combined["id"] = "merge";
            combined["color"] = colors_palette["merge"]["value"];
          }

          class_instance.update_q1("view", {ids: added_ids, combined: combined, colors: added_colors});
          class_instance.update_q2("view", {ids: added_ids, combined: combined, colors: added_colors});
        });
      }

      $("#add_btn").on( "click", add_btn_onclick);
    }

    function main_input_autocomplete() {
      var inp = class_instance.main_input;
      var arr = autocomplete_list;
      /*the autocomplete function takes two arguments,
      the text field element and an array of possible autocompleted values:*/
      var currentFocus;
      /*execute a function when someone writes in the text field:*/
      inp.addEventListener("input", function(e) {
          var a, b, i, val = this.value;
          /*close any already open lists of autocompleted values*/
          closeAllLists();
          if (!val) { return false;}
          currentFocus = -1;
          /*create a DIV element that will contain the items (values):*/
          a = document.createElement("DIV");
          a.setAttribute("id", this.id + "autocomplete-list");
          a.setAttribute("class", "autocomplete-items");
          /*append the DIV element as a child of the autocomplete container:*/
          //this.parentNode.appendChild(a);
          document.getElementById("main_input_container").appendChild(a);

          /*for each item in the array...*/
          for (i = 0; i < arr.length; i++) {
            /*check if the item starts with the same letters as the text field value:*/
            if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
              /*create a DIV element for each matching element:*/
              b = document.createElement("DIV");
              /*make the matching letters bold:*/
              b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
              b.innerHTML += arr[i].substr(val.length);
              /*insert a input field that will hold the current array item's value:*/
              b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
              /*execute a function when someone clicks on the item value (DIV element):*/
                  b.addEventListener("click", function(e) {
                  /*insert the value for the autocomplete text field:*/
                  inp.value = this.getElementsByTagName("input")[0].value;
                  /*close the list of autocompleted values,
                  (or any other open lists of autocompleted values:*/
                  closeAllLists();
              });
              a.appendChild(b);
            }
          }
      });
      /*execute a function presses a key on the keyboard:*/
      inp.addEventListener("keydown", function(e) {
          var x = document.getElementById(this.id + "autocomplete-list");
          if (x) x = x.getElementsByTagName("div");
          if (e.keyCode == 40) {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
          } else if (e.keyCode == 38) { //up
            /*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
          } else if (e.keyCode == 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (currentFocus > -1) {
              /*and simulate a click on the "active" item:*/
              if (x) x[currentFocus].click();
            }
          }
      });
      function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
      }
      function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (var i = 0; i < x.length; i++) {
          x[i].classList.remove("autocomplete-active");
        }
      }
      function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
          if (elmnt != x[i] && elmnt != inp) {
          x[i].parentNode.removeChild(x[i]);
        }
      }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
    }

    function set_views(){
        init_q1();
        function init_q1(){
          $.ajax({
                  type: "GET",
                  url: class_instance.acdh_data_url+"res/technique.json",
                  dataType: "json",
                  async: true,
                  success: function(data) {
                      class_instance.Q1.data = JSON.parse(JSON.stringify(data));
                      //console.log(class_instance.Q1);
                      class_instance.update_q1("filter");
                      init_q2();
                  }
          });
        }
        function init_q2(){
          $.ajax({
                  type: "GET",
                  url: class_instance.acdh_data_url+"res/affiliation.json"+"?time="+(new Date().getTime()).toString(),
                  dataType: "json",
                  async: true,
                  success: function(data) {
                    class_instance.update_q2("filter");
                  }
          });
        }
    }
  }

  update_q1(type, params={}){

    var DATA_REF = null;
    if (type == "view") {

      DATA_REF = this.FILTERED_DATA;
      //params should have <ids> and <colors>
      // <ids> are the institutions IDs while <colors> are the related colors
      var combined_techniques = {}
      var l_techniques = {};
      for (var i = 0; i < params["ids"].length; i++) {
        var inst_id = params["ids"][i];
        if (inst_id in DATA_REF) {
          l_techniques[inst_id] = {"techniques":[], "color":[], "count":0};
          for (var a_tech_k in DATA_REF[inst_id]["techniques"]) {
            var tech_name = DATA_REF[inst_id]["techniques"][a_tech_k]["name"];
            l_techniques[inst_id]["techniques"].push(tech_name);
            l_techniques[inst_id]["color"].push(params["colors"][i]);
            if (!(tech_name in combined_techniques)) {
              combined_techniques[tech_name] = 0;
            }
            combined_techniques[tech_name] += 1;
          }
        }
      }

      //build the data to send to the view
      //in the form: {<tech_name>:<color>}
      var view_res = {};
      for (var inst_k in l_techniques) {
        for (var i = 0; i < l_techniques[inst_k]["techniques"].length; i++) {
          var a_tech_name = l_techniques[inst_k]["techniques"][i];

          //check if is a combined tech first
          if(combined_techniques[a_tech_name] > 1){
            view_res[a_tech_name] = params["combined"]["color"];
          }else {
            view_res[a_tech_name] = l_techniques[inst_k]["color"][i];
          }
        }
      }

      //update the view
      this.update_barchart(view_res);
    }

    if (type == "filter") {

        DATA_REF = this.DATA;

        /* TODO the filtering functions */
        var filterd_dois = new Set();
        for (var k_tech_name in this.Q1.data) {
          k_tech_name = k_tech_name.toString().trim();
          var tech_obj = this.Q1.data[k_tech_name];
          this.Q1.index_set[k_tech_name] = new Set();

          /* CHECK FILTERS HERE: */
          /* By date*/
          for (var k_year in tech_obj) {
            var is_ok = true;
            if (Object.keys(params).length > 0) {
              is_ok = ((params.date["yfrom"] <= parseInt(k_year)) && (params.date["yto"] >= parseInt(k_year)));
            }
            if (is_ok) {
              for (var i = 0; i < tech_obj[k_year]["doilist"].length; i++) {
                var a_doi_val = tech_obj[k_year]["doilist"][i];
                filterd_dois.add(a_doi_val);
                this.Q1.index_set[k_tech_name].add(a_doi_val);
              }
            }
          }
        }

        //Build again <FILTERED_DATA>
        this.FILTERED_DATA = JSON.parse(JSON.stringify(DATA_REF));
        for (var k_inst in this.FILTERED_DATA) {
            var dois_filtered_objlist = {};
            var all_inst_dois = this.FILTERED_DATA[k_inst]["dois"];
            for (var an_inst_doi_k in all_inst_dois) {
              if(!(filterd_dois.has(an_inst_doi_k))) {
                delete filterd_dois[an_inst_doi_k];
              }
            }
        }
        //console.log(this.FILTERED_DATA);

        this.update_q1("view", {ids: [], combined: null, colors: []});
    }
  }
  /*<items>:  {<technique_name>: <color>}*/
  update_barchart(items = {}){
    var class_instance = this;

    var barchart_techniques = {};
    for (var k_tech_name in this.Q1.index_set) {
      barchart_techniques[k_tech_name] = this.Q1.index_set[k_tech_name].size;
    }

    class_instance.Q1.barchart_data.y = Object.keys(barchart_techniques);
    class_instance.Q1.barchart_data.x = Object.values(barchart_techniques);
    class_instance.Q1.barchart_data.highlighted = JSON.parse(JSON.stringify(items));

    //console.log("Bar chart data are:");
    //console.log(class_instance.Q1.index_set, class_instance.Q1.barchart_data);

    //build the bar chart
    build_barchart();

    function build_barchart() {

      //set colors before building
      var bar_colors = [];
      for (var i = 0; i < class_instance.Q1.barchart_data.y.length; i++) {
        var tech_name = class_instance.Q1.barchart_data.y[i];
        var color_val = class_instance.Q1.default_color;
        if (tech_name in class_instance.Q1.barchart_data.highlighted) {
          color_val = class_instance.Q1.barchart_data.highlighted[tech_name];
        }
        bar_colors.push(color_val);
      }

      var barchart_data = [{
          type: 'bar',
          x: class_instance.Q1.barchart_data.x ,
          y: class_instance.Q1.barchart_data.y,
          orientation: 'h',
          marker: {
            color: bar_colors,
            width: 1 }
       }];
       var barchart_layout = {
          autosize: false,
          width: 580,
          height: 850,
          paper_bgcolor: '#f5fcfb',
          plot_bgcolor: '#f5fcfb',
          font: {size: 14},
          bargap: 0.3,
          margin: {
            t: 20, //top margin
            l: 280, //left margin
            r: 10, //right margin
            b: 20 //bottom margin
          },
          xaxis:{
            type: 'log'
          },
          yaxis: {
            ticksuffix: '  ',
            tickmode: 'array',
            automargin: true,
            titlefont: { size: 45 },
          },
          //paper_bgcolor: '#7f7f7f',
          //plot_bgcolor: '#c7c7c7'
        };
       Plotly.newPlot('q1', barchart_data, barchart_layout, {displayModeBar: false});
       document.getElementById("q1").on('plotly_click', function(data){
          var k_tech = data["points"][0]["label"];
          class_instance.build_info_section("technique", {"id":k_tech,"set_dois":class_instance.Q1.index_set[k_tech]});
      });
    }
  }

  update_q2(type, params={}){
    var class_instance = this;
    var DATA_REF = null;
    if (type == "view") {
      //reset
      class_instance.Q2.cy_data = {nodes:[],edges:[],highlighted:{}};
      class_instance.Q2.index_set = {"nodes":{},"edges":{}, "max_node_weight": -1};
      DATA_REF = this.FILTERED_DATA;

      var items = {};
      if (("ids" in params) && ("colors" in params)){
        var items = {};
        for (var i = 0; i < params["ids"].length; i++) {
          items[params["ids"][i]] = params["colors"][i];
        }
      }

      function add_node(inst_id){
        if (inst_id != -1) {
          if (!(inst_id in class_instance.Q2.index_set["nodes"])) {
            var short_name = "none";
            if (inst_id in DATA_REF){
              var short_name = DATA_REF[inst_id]["name"];
              if (short_name.length > 24) {
                short_name = short_name.substring(0,24) + "...";
              }
            }
            var node_weight = Object.keys(DATA_REF[inst_id]["dois"]).length;
            if (node_weight > class_instance.Q2.index_set.max_node_weight) {
              class_instance.Q2.index_set.max_node_weight = node_weight;
            }
            class_instance.Q2.index_set["nodes"][inst_id] = {"data": {"id": inst_id, "label": short_name, "weight": node_weight }};
            return true;
          }
        }
        return false;
      }
      function add_edge(source_inst, target_inst, doi_id){
          if (((target_inst != -1) && (source_inst != -1)) && (source_inst != target_inst)) {
            var undirected_edge_k = null;
            if (source_inst+"-"+target_inst in class_instance.Q2.index_set.edges){
                undirected_edge_k = source_inst.toString()+"-"+target_inst.toString();
            }else {
                if (target_inst+"-"+source_inst in class_instance.Q2.index_set.edges){
                    undirected_edge_k = target_inst.toString()+"-"+source_inst.toString();
                  }
            }
            if (undirected_edge_k == null) {
                class_instance.Q2.index_set.edges[source_inst.toString()+"-"+target_inst.toString()] = {"data": {"id": source_inst+"-"+target_inst,"source": source_inst, "target":target_inst, "weight": 1, "set_dois": new Set()}}
                class_instance.Q2.index_set.edges[source_inst.toString()+"-"+target_inst.toString()]["data"]["set_dois"].add(doi_id);
            }else {
                class_instance.Q2.index_set.edges[undirected_edge_k]["data"]["weight"] += 1;
                class_instance.Q2.index_set.edges[undirected_edge_k]["data"]["set_dois"].add(doi_id);
            }
          }
      }

      for (var inst_k in DATA_REF) {
            var go_on = true;
            if (Object.keys(items).length != 0) {
              go_on = inst_k in items;
            }
            if (go_on){
              add_node(inst_k);
              var inst_obj = DATA_REF[inst_k];
              for (var doi_k in inst_obj["dois"]) {
                var doi_obj = inst_obj["dois"][doi_k];
                for (var i = 0; i < doi_obj["acdh_aff"].length; i++) {

                  var target_inst = doi_obj["acdh_aff"][i];
                  //add the node
                  add_node(target_inst);
                  //now add the edge
                  add_edge(inst_k, target_inst, doi_k);
                }
              }
            }
       }
       //console.log(this.Q2.index_set);

       this.update_cy(items);
    }
    if (type == "filter"){
      this.update_q2("view");
    }
  }

  /*<items>:  {<technique_name>: <color>}*/
  update_cy(items={}){
    var class_instance = this;

    //build highlighted items
    if (Object.keys(items).length > 0){
      this.Q2.cy_data.highlighted = items;
    }
    this.Q2.cy_data.nodes = Object.values(this.Q2.index_set.nodes);
    this.Q2.cy_data.edges = Object.values(this.Q2.index_set.edges);
    build_cy();

    function build_cy(){

        class_instance.Q2.cy = window.cy = cytoscape({
                container: document.getElementById('cy'),

                autounselectify: true,

                boxSelectionEnabled: false,

                layout: {
                  name: 'cola'
                },

                style: [
                  {
                    selector: 'node',
                    css: {
                      'opacity': 1,
                      'background-color': class_instance.Q2.node_default_color
                    }
                  },
                  {
                    selector: 'node[label]',
                    style: {
                      'content': 'data(label)'
                    },
                  },
                  {
                    selector: 'edge',
                    css: {
                      'opacity': 1,
                      'line-color': class_instance.Q2.edge_default_color
                    }
                  }
                ],

                elements: {
                  nodes: class_instance.Q2.cy_data.nodes,
                  edges: class_instance.Q2.cy_data.edges
                }
        });
        var cy = class_instance.Q2.cy;

        // ZOOM and FIT CY graph
        cy.maxZoom(3);
        cy.minZoom(0.4);
        $("#q2").prepend('<div id="diagram_fit" class=""><a id="fit_btn" >&#10070; Fit graph</a></div>');
        $("#diagram_fit #fit_btn").on( "click", function() {
              class_instance.Q2.cy.fit();
        });

        cy.nodes('node[weight = 0]').style({'opacity': 0.3});
        //Highlight nodes
        var highlighted = class_instance.Q2.cy_data.highlighted;
        for (var inst_id in highlighted) {
            cy.nodes('node[id="'+inst_id+'"]').style({'background-color': highlighted[inst_id]});
        }

        //Adjust weight
        //cy.remove('node[weight = 0]');
        var max_node_weight = class_instance.Q2.index_set.max_node_weight;
        if (max_node_weight == 0) {
          max_node_weight = 10;
        }
        var weight_fact_node = 80/max_node_weight;
        var weight_fact_edge = weight_fact_node * 0.45;
        var cy_nodes = class_instance.Q2.cy_data.nodes;
        var cy_edges = class_instance.Q2.cy_data.edges;
        for (var i = 0; i < cy_nodes.length; i++) {
          var a_node = class_instance.Q2.index_set.nodes[cy_nodes[i]["data"]["id"]];
          var a_node_weight = a_node["data"]["weight"];
          if (a_node_weight < 15) {
            a_node_weight = 15;
          }
          cy.nodes('node[id="'+a_node["data"]["id"]+'"]').style({'width': weight_fact_node * a_node_weight, 'height': weight_fact_node * a_node_weight});
        }
        for (var i = 0; i < cy_edges.length; i++) {
          var a_edge = class_instance.Q2.index_set.edges[cy_edges[i]["data"]["id"]];
          var a_edge_weight = a_edge["data"]["weight"];
          if (a_edge_weight < 2) {
            a_edge_weight = 2;
          }
          cy.edges('edge[id="'+a_edge["data"]["id"]+'"]').style({'width': (a_edge_weight * weight_fact_edge).toString()+"pt"});
        }

        _elem_events_handle();

        function _elem_events_handle(){

                  //nodes on click handler
                  cy.nodes().on('click', function(e){
                      class_instance.build_info_section("institution", this._private.data);
                  });
                  //edges on click handler
                  cy.edges().on('click', function(e){
                      class_instance.build_info_section("collaboration", this._private.data);
                  });

                  cy.edges().on('mouseover', function(e){
                    cy.edges('edge[id="'+this._private.data.id+'"]').style({'line-color': "#447ab2"});
                  });
                  cy.edges().on('mouseout', function(e){
                    cy.edges('edge[id="'+this._private.data.id+'"]').style({'line-color': class_instance.Q2.edge_default_color});
                  });

                  cy.nodes().on('mouseover', function(e){
                    cy.nodes('node[id="'+this._private.data.id+'"]').style({'border-color': "#447ab2",'border-width': 3});
                  });
                  cy.nodes().on('mouseout', function(e){
                    cy.nodes('node[id="'+this._private.data.id+'"]').style({'border-width': 0});
                  });
        }

    }
  }

  build_info_section(type, elem){
    if ($(".info-section").length > 0 ) {
      $(".info-section").remove();
    }
    $("body").append('<div id="info_section" class="info-section"><div class="del-btn">X</div></div>');
    $(".info-section .del-btn").on( "click", function () {
      $(this).parent().remove();
    });

    var class_instance = this;
    var l_publications = {};

    //generate the info according to the element
    if (type == "institution") {
      var inst_id = elem["id"];
      if (inst_id in this.FILTERED_DATA){
        var inst_obj = this.FILTERED_DATA[inst_id];
        var str_html = "";

        //Name + City + Country
        var flag_courses = false;
        if ("name" in inst_obj) {
          str_html = str_html + "<div class='node title'><span class='pre'>Institution</span><span>"+inst_obj["name"]+"</span>";
          //str_html = str_html + "<div class='node title'><span>"+inst_obj["name"]+"</span>";
          var courses_ids = Object.keys(inst_obj["course"]);
          //console.log(courses_ids.length);
          if (courses_ids.length > 0) {
            flag_courses = true;
            var a_course = inst_obj["course"][courses_ids[0]]
            if ("city" in a_course) {
              str_html = str_html + "<span>, "+a_course["city"]["name"]+"</span>";
            }
            if ("country" in a_course) {
              str_html = str_html + "<span>, "+a_course["country"]["name"]+"</span>";
            }
          }
          str_html = str_html + "</div>";
        }

        //Courses
        if (flag_courses) {
          str_html = str_html + "<div class='courses-header'>Courses</div><div class='courses'>";
          var all_str_course = "";
          for (var course_k in inst_obj["course"]) {
            var course_obj = inst_obj["course"][course_k];
            var str_course = "<div class='a-course'>";

            if (("active" in course_obj) && (course_obj["active"] != null)){
              var act_value = "Not active";
              var act_class = "";
              if(course_obj["active"]){
                act_value = "Active";
                act_class = "active";
              }
              str_course = str_course + "<div class='c-active "+act_class+"'>"+act_value+"</div>";
            }
            if (("name" in course_obj) && (course_obj["name"] != null)) {
              str_course = str_course + "<div class='c-title'>"+course_obj["name"]+"</div>";
            }
            if (("language" in course_obj) && (course_obj["language"] != null)){
              str_course = str_course + "<div class='c-language'><span class='pre'>Language: </span>"+course_obj["language"]["name"]+"</div>";
            }
            if (("department" in course_obj) && (course_obj["department"] != null)){
              str_course = str_course + "<div class='c-department'><span class='pre'>Department: </span>"+course_obj["department"]+"</div>";
            }
            if (("tadirah_techniques" in course_obj) && (course_obj["tadirah_techniques"] != null) && (Object.keys(course_obj["tadirah_techniques"]).length > 0)){
              var str_tadirah_techniques = "<div class='c-techniques'><span class='pre'>Techniques: </span>";
              for (var i = 0; i < course_obj["tadirah_techniques"].length; i++) {
                var tech_name = course_obj["tadirah_techniques"][i]["name"].trim();
                str_tadirah_techniques = str_tadirah_techniques + "<div data-id='"+tech_name+"' class='tech'>"+tech_name+"</div>";
              }
              str_course = str_course + str_tadirah_techniques + "</div>";
            }
            if (("info_url" in course_obj) && (course_obj["info_url"] != null)){
              str_course = str_course + "<div class='c-infourl'><a href='"+course_obj["info_url"]+"'>Visit the web site</a></div>";
            }
            all_str_course = all_str_course +  str_course + "</div>";
          }
          str_html = str_html + all_str_course + "</div>";
        }

        //articles
        var flag_articles = false;
        if (("dois" in inst_obj) && (Object.keys(inst_obj["dois"]).length > 0)) {
          flag_articles = true;
          var str_doi = "";
          var large_sec = "";
          if (!(flag_courses)) {
            large_sec = "large";
          }
          str_html = str_html + "<div class='dois-header'>Published articles</div><div class='dois "+large_sec+"'>";
          str_html = str_html + build_html_publication(inst_obj["dois"],"dict") + "</div>";
        }

        $("#info_section").append(str_html);
        if (!(flag_articles)) {
          $(".courses").addClass("large");
        }

        $(".info-section .a-course .c-techniques .tech").on( "click", function () {
          class_instance.build_info_section("technique", {"id":$(this).attr("data-id"),"set_dois":class_instance.Q1.index_set[$(this).attr("data-id")]});
        });
      }
    }

    if (type == "collaboration") {
      var source_inst_id = elem["source"];
      var target_inst_id = elem["target"];

      if ((source_inst_id in this.FILTERED_DATA) && (target_inst_id in this.FILTERED_DATA)){
        var source_obj = this.FILTERED_DATA[source_inst_id];
        var target_obj = this.FILTERED_DATA[target_inst_id];
        var str_html = "";
        if (("name" in source_obj) && ("name" in target_obj)) {
          str_html = str_html + "<div class='edge title'><span class='pre'>Collaboration</span>";
          var dict = {"0": source_obj, "1": target_obj};
          for (var k in dict) {
            var inst_obj = dict[k];
            var str_inst_name = "";
            str_inst_name = str_inst_name +"<span>"+inst_obj["name"]+"</span>";
            var courses_ids = Object.keys(inst_obj["course"]);
            if (courses_ids > 0) {
              flag_courses = true;
              var a_course = inst_obj["course"][courses_ids[0]]
              if ("city" in a_course) {
                str_inst_name = str_inst_name + "<span>, "+a_course["city"]["name"]+"</span>";
              }
              if ("country" in a_course) {
                str_inst_name = str_inst_name + "<span>, "+a_course["country"]["name"]+"</span>";
              }
            }
            if (k == "0") {
                str_html = str_html + str_inst_name + "<span class='divider'> and </span>";
            }else {
                str_html = str_html + str_inst_name +"</div>";
            }
          }
        }

        if(elem["set_dois"].size > 0){
          str_html = str_html + "<div class='dois-header'>Published articles</div><div class='dois large'>";
          str_html = str_html + build_html_publication(elem["set_dois"]) + "</div>";
        }

        $("#info_section").append(str_html);
      }
    }

    if (type == "technique") {
      var tech_id = elem["id"];
      var str_html = "";
      str_html = str_html + "<div class='tech title'><span class='pre'>Tadirah technique</span>\""+tech_id+"\" </div>";

      if(elem["set_dois"].size > 0){
        str_html = str_html + "<div class='dois-header'>Articles that adopts this technique</div><div class='dois large'>";
        str_html = str_html + build_html_publication(elem["set_dois"]) + "</div>";
      }else {
        str_html = str_html + "<div class='dois-header no-res'>We didn't find any article that adopts this technique</div><div class='dois large'></div>";
      }
      $("#info_section").append(str_html);
    }

    function build_html_publication(data, type = "set") {
      str_doi = "";
      function build_l_publication(a_doi_k){
        if (a_doi_k in class_instance.DOCS_INDEX) {
          var doc_obj = class_instance.DOCS_INDEX[a_doi_k];
          var key_year = doc_obj["year"];
          if (doc_obj["year"] == "none") {
            key_year = "Unknown";
          }
          if (!(key_year in l_publications)) {
            l_publications[key_year] = []
          }
          l_publications[key_year].push({"id":a_doi_k,"title":doc_obj["title"]})
        }
      }
      if (type == "set") {
        data.forEach(build_l_publication);
      }else {
        for (var a_doi_k in data) {
          build_l_publication(a_doi_k);
        }
      }

      var sorted_l_publication = {};
      Object.keys(l_publications)
          .sort(function(a, b){return a-b})
          .forEach(function(v, i) {
            sorted_l_publication[v] = l_publications[v];
      });
      for (var k_year in sorted_l_publication) {
        str_doi = str_doi + "<div class='d-year'>"+k_year+"</div>";
        for (var i = 0; i < sorted_l_publication[k_year].length; i++) {
          var pub_obj = sorted_l_publication[k_year][i];
          str_doi = str_doi + "<div class='d-title'><span>"+pub_obj["title"]+" </span><span><a target='_blank' href='https://doi.org/"+pub_obj["id"]+"'>https://doi.org/"+pub_obj["id"]+"</a></span></div>";
        }
      }
      return str_doi;
    }

  }
}
