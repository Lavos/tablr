var Tablr = (function(){
	var GenericModel = Blocks.Model.inherits();

	var DataSet = Blocks.Collection.inherits(function(){

	}, {
		desc: false,
		sort_property: null,

		sum: function (property) {
			return _.reduce(this, function(memo, model){
				return memo + model.get(property);
			}, 0);
		},

		average: function (property) {
			return (this.sum(property) / this.length).toFixed(2);
		},

		sort_by_property: function (header, property) {
			var self = this;

			if (self.sort_property === property) {
				self.desc = !self.desc;	
			};

			self.sort_property = property;

			self.sort(function(a, b){
				// GenericModel instances
				var aa = a.get(property);
				var bb = b.get(property);

				var gr_dir = 1;
				var lt_dir = -1;

				if (self.desc) {
					gr_dir = -1;
					lt_dir = 1;
				};

				if (aa === null) {
					return lt_dir;
				};

				if (aa > bb) {
					return gr_dir;
				};

				if (aa < bb) {
					return lt_dir;
				};

				return 0;
			});

			self.fire('moved');
		}
	});


	// views

	var Header = Blocks.View.inherits(function(display_groups){
		this.display_groups = display_groups;

		this.render();
	}, {
		tag_name: 'thead',

		events: [
			{ event_name: 'click', selector: 'th[data-property]', function_name: 'sort' }
		],

		sort: function (e){
			this.fire('sort', e.currentTarget.getAttribute('data-property'));
		},

		render: function(){
			var self = this;

			var group_row = document.createElement('tr');
			var title_row = document.createElement('tr');

			_.each(self.display_groups, function(list, group_name){
				var group_th = document.createElement('th');
				group_th.setAttribute('colspan', list.length);
				group_th.innerHTML = group_name;
				group_row.appendChild(group_th);

				_.each(list, function(header_name) {
					var header = document.createElement('th');
					header.setAttribute('data-property', header_name);
					header.innerHTML = header_name;
					title_row.appendChild(header);
				});
			});

			self.element.innerHTML = '';
			self.element.appendChild(group_row);
			self.element.appendChild(title_row);
		}
	});

	var Body = Blocks.View.inherits(function(dataset, prop_list){
		this.dataset = dataset;
		this.prop_list = prop_list;
		this.dataset.on('moved', this.render, this);
	}, {
		tag_name: 'tbody',

		render: function(dataset){
			var self = this;

			var frag = document.createDocumentFragment();

			_.each(dataset, function(model){
				var row = document.createElement('tr');

				_.each(self.prop_list, function(prop){
					var cell = document.createElement('td');
					var value = (model.get(prop) === null ? 'NULL' : model.get(prop));
					cell.innerHTML = value;
					row.appendChild(cell);
				});

				frag.appendChild(row);
			});

			this.element.innerHTML = '';
			this.element.appendChild(frag);
		}
	});


	var Foot = Blocks.View.inherits(function(dataset, flat_list, agg_props){
		this.dataset = dataset;
		this.flat_list = flat_list;
		this.agg_props = agg_props;
	}, {
		tag_name: 'tfoot',

		render: function(dataset){
			var self = this;

			var header_row = document.createElement('tr');
			var value_row = document.createElement('tr');

			_.each(self.flat_list, function(prop){
				if (self.agg_props.hasOwnProperty(prop)) {
					var header_cell = document.createElement('th');
					var value_cell = document.createElement('td');
					header_cell.innerHTML = self.agg_props[prop];
					value_cell.innerHTML = self.dataset[self.agg_props[prop]](prop);
				} else {
					var header_cell = document.createElement('td');
					var value_cell = document.createElement('td');
					header_cell.innerHTML = value_cell.innerHTML = '&nbsp;';
				};

				header_row.appendChild(header_cell);
				value_row.appendChild(value_cell);
			});

			this.element.innerHTML = '';
			this.element.appendChild(header_row);
			this.element.appendChild(value_row);
		}
	});


	var Interface = Blocks.View.inherits(function(params){
		var defaults = {
			target: $(),
			display_groups: {},
			aggregrate: {},
		};

		_.defaults(this.options = {}, params, defaults);

		this.dataset = new DataSet();

		// this table holds the views as they are table-based elements
		this.table = document.createElement('table');
		this.element.appendChild(this.table);

		// add Header View for controlling sorting
		this.header = new Header(this.options.display_groups);
		this.header.on('sort', this.dataset.sort_by_property, this.dataset);
		this.table.appendChild(this.header.element);

		// get flat property list from display_groups
		this.flat_list = _.flatten(_.values(this.options.display_groups));

		// add Body View for displaying ordered and filtered data
		this.body = new Body(this.dataset, this.flat_list);
		this.table.appendChild(this.body.element);

		this.foot = new Foot(this.dataset, this.flat_list, this.options.aggregrate);
		this.table.appendChild(this.foot.element);

		this.options.target.append(this.element);
	}, {
		tag_name: 'div',
		element_classes: 'tablr',

		ingest: function (data) {
			var self = this;

			// if there's already data, clear it in favor of the new data
			self.dataset.removeAll();

			_.each(data, function(item){
				var piece = new GenericModel();

				_.each(self.flat_list, function(prop){
					piece.set(prop, item[prop]);
				});

				self.dataset.push(piece);
			});

			self.dataset.fire('moved', self.dataset);
			self.foot.render();
		}
	});

	return Interface;
})();
