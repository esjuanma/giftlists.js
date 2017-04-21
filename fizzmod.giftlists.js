//#! babel

(function($, Fizzmod, window, undefined) {

	/**
	 *		Methods list
	 *		------------
	 *
	 *		Fizzmod.GiftLists.getProds(listID)											- Gets all the list's products
	 *		
	 *		Fizzmod.GiftLists.getList(listID)											- Gets all the list's products - Same as getProds but with some parsed extra data
	 *		
	 *		Fizzmod.GiftLists.getLists(typeIDs)											- Gets all the user's lists
	 *
	 *		Fizzmod.GiftLists.updateProdQuantity(listID, prodSku, prodQuantity)			- Updates a product quantity
	 *
	 *		Fizzmod.GiftLists.newList(name, typeID)										- Creates a new list
	 *
	 *		Fizzmod.GiftLists.createFullList(data)										- Creates a new complex list
	 *
	 *		Fizzmod.GiftLists.editFullList(data)										- Edits a new complex list
	 *
	 *		Fizzmod.GiftLists.deleteList(listID)										- Deletes a list
	 *
	 *		Fizzmod.GiftLists.removeItem(listID, sku)									- Removes an item from a list
	 *
	 *		Fizzmod.GiftLists.addItem(listID, sku, quantity, addToQuantity)				- Adds a single item to an existing list
	 *
	 *		Fizzmod.GiftLists.addItems(listID, items, addToQuantity)					- Adds items to an existing list
	 *
	 *		Fizzmod.GiftLists.addItemsNewList(items, listName, typeID, addToQuantity)	- Adds items to a new list
	 *
	 *		Fizzmod.GiftLists.sendToCart(listID)										- Sends a full list to the cart
	 *
	 *		Fizzmod.GiftLists.getBuyedQuantity(listID)									- Gets a list's total and buyed products
	 *
	 *		Fizzmod.GiftLists.shareList(config)											- Sends an email to friend/s. Search method example and config requirements.
	 *
	 *		Fizzmod.GiftLists.search(query)												- Allows giftlist searches
	 *
	 */

	/**
	 *		Documentation - This is used for the non-covered topics described on the method's list
	 *		--------------------------------------------------------------------------------------
	 *
	 *		Check this out : https://github.com/vtex/vtex.js/blob/master/src/checkout.coffee
	 *
	 *		Giftlist name:
	 *
	 *			Simple list creation:
	 *				It has to contains at least 1 alphanumeric character, because Vtex
	 *				uses it to generate the list URL
	 *
	 *			Complex list creation:
	 *				It can have any name, no rules. The important thing is that in this case
	 *				URL is taken from the sent data (by ajax), so it can never be repeated along all users.
	 *				To handle this, a prefix/postfix to the list url must be used, plus the listname.
	 */

	/**
	 *		Config options
	 *		----------------------------------------------
	 *		listTypeIDs		- contains every listtypeId available, used to get all user's lists
	 *		defListTypeID	- default listtype to create a newlist
	 *		listsPath		- Path for list url. It's /giftlist by default
	 *		listPath		- Path for a single list. It's /giftlist/product by default
	 */

	
	/**
	 *	Formats a List properly and inherits some methods
	 */
	 
	class List {
		
		constructor (id, name, url) {

			this.id		= id;
			this.name	= name;
			this.url	= url;
		}

		// Removes self list
		delete () {
			return Fizzmod.GiftLists.deleteList(this.id);
		}

		// Remove item
		removeItem (sku) {
			return Fizzmod.GiftLists.removeItem(this.id, sku);
		}

		// Get self products
		getProds () {
			return Fizzmod.GiftLists.getProds(this.id);
		}

		// Add item to self
		addItem (sku, quantity, addToQuantity) {
			return Fizzmod.GiftLists.addItem(this.id, sku, quantity, addToQuantity);
		}

		// Add item to self
		addItems (items, addToQuantity) {
			return Fizzmod.GiftLists.addItem(this.id, items, addToQuantity);
		}
	}


	/**
	 *	Formats a Product properly
	 */

	class Product {

		constructor (product) {

			// Sku
			this.sku		= product.SkuId;
			
			// Name
			this.name		= product.Name;
			
			// Link
			this.url		= product.ProductUrl;

			// Availability
			this.available	= product.Value.match(/\d/g) != null;
			
			if( this.available ) {
				
				// Value - Raw
				this.value	= product.Value.match(/\d/g).join('')/100;

				// Value - Formated
				this.fvalue	= product.Value;

			} else { this.value = 0; this.fvalue = 0; }
			
			// Quantity of items
			this.wished		= $(product.WishedAmount.replace(/(\r\n|\n|\r)/gm,'')).filter('.giftlistsku-input-wishedamt').val();
			
			// Quantity of items - purchased
			this.purchased	= product.PurchasedAmount;
			
			// Image data
			this.image		= {
				url		: product.Image.src,
				alt		: product.Image.alt,
				title	: product.Image.title,
				width	: product.Image.width,
				height	: product.Image.height
			};
		}
	}

	let self;

	Fizzmod.GiftLists = {

		// Product constructor
		Product		: Product,

		// List constructor
		List		: List,

		// Vtex/system config
		sysConfig	: {

			// Add items to existing
			addItemsURL			: '/no-cache/giftlistv2/skutolist',
			// Fast list-create and add items
			addItemsNewListURL	: '/no-cache/giftlistv2/skutonewlist',
			
			// Fast list-create
			createNewListURL	: '/no-cache/giftlistv2/skutonewlist',
			// Complex list-create. Edit.
			createEditListURL	: '/no-cache/giftlistv2/save/',

			// Delete list
			deleteListURL		: '/no-cache/giftlistv2/delete/list/{{listID}}',

			// Get all user's lists
			getListsURL			: '/no-cache/giftlistv2/getinsertsku/{{typeIDs}}/list',
			// Get all list's items
			getProdsURL			: '/no-cache/giftlistv2/getskulist/{{listID}}/{{imgSize}}/{{pageSize}}/true',
			// Change an item quantity
			changeProdAmountURL	: '/no-cache/giftlistv2/changewishedamount/{{listID}}/{{prodSku}}/{{prodQuantity}}',

			saveAdress			: '/no-cache/giftlistv2/address/save/',

			// Share giftlist
			shareByEmailURL		: '/giftlistv2/SendShareMail/{{listID}}',

			// Adds an entire list to the cart
			sendToCart			: '/no-cache/giftlistv2/sendtocart/{{listID}}',

			// Backend to set if buying por giftlists
			setCookie			: '/no-cache/giftlistcookiemanage.aspx?id=0&ref=/checkout',

			// For making list searchs
			searchURL			: '/no-cache/giftlistv2/search/',
			
			// 
			getBuyedURL			: '/no-cache/giftlistv2/getstatistics/{{listID}}/{{imgSize}}/{{orderURL}}',

			// 
			removeCookieGiftlist: '/api/checkout/pub/orderForm/giftRegistry/bce9c5ed62ae4e12bae371bf8ad512a9/remove',
			
			// Current order info
			unknownURL			: '/no-cache/giftlistv2/getskuorderinfo/{{listID}}/{{sku}}/false'
		},

		cache : {}, // pendiente


		/**
		 *	Initialize
		 */

		init () {
			
			self = this;

			self.config = {
				listsPath		: '/giftlist',
				listPath		: '/giftlist/product'
			};

			return self;
		},

		/**
		 *	Gets list type IDs and default list type
		 */
		getListTypes () {
			return self.config.listTypeIDs;
		},
		getDefaultListType () {
			return self.config.defListTypeID;
		},

		/**
		 *	Sets list type IDs and default list type
		 */
		setListTypes (listTypes) {
			return self.config.listTypeIDs = listTypes;
		},
		setDefaultListType (listType) {
			return self.config.defListTypeID = listType;
		},

		/**
		 *	Sets/gets store name
		 */
		setStoreName (name) {
			return self.config.storeName = name;
		},
		getStoreName () {
			return self.config.storeName;
		},

		/**
		 *	Gets/sets hole config. Previous functions can be used instead.
		 */
		getConfig () {
			return self.config;
		},
		setConfig (config) {
			$.extend(self.config, config);
		},

		getTotal (listID) {

			if( true || ! self.cache[listID] ) {
				
				self.getProds(listID).done(function(prods) {

					return self.sumProds(prods);
				});

			} else {

				let prods = self.cache[listID];

				// ...
			}
		},

		/**
		 *		Utils
		 */

		 Utils: {

		 	itemsData (items) {

		 		if(typeof ignoreUnavailables == 'undefined') ignoreUnavailables = true;

				let data = {
					total		: 0,
					quantity	: 0,
					available	: 0,
					unavailable	: 0
				};

				$.each(items, function(i, item) {

					data.quantity++;

					if( item.available ) {

						data.total += item.value * item.wished;

						data.available++;

					} else data.unavailable++;

				});

				return data;
			},

			/**
			 *	Important:
			 *	Vtex allows any giftlist name in complex creation.
			 *	This is a rule for fast list-creation, wich uses list name for setting url.
			 */
			validName (name) {
				return name.match(/[a-z0-9]/i) !== null;
			},

			// Keeps only numbers and letters. Lowercase.
			urlString (name) {
				return name.replace(/[^a-z0-9]/gi, '').toLowerCase();
			},

			/**
			 *	Important:
			 *	When using this, userId and addressName fields from MasterData AD must be set public for writing
			 */
			saveAddress (data, storeName = self.config.storeName) {
				
				if(storeName === undefined) {
					throw 'storeName is not set, Fizzmod.Giftlists.setStoreName(storeName) or Fizzmod.Giftlists.setConfig({..}) must be called';
				}
				
				Fizzmod.MasterData.setStore();
				return Fizzmod.MasterData.insert(data, 'AD');
			},

			// Methods to work on Create page
			Create : {

				getCurrentType () {
					
					// Gets list types container and then it's selected value
					let giftlistTypesContainer = $('select#giftlisttype');
					let listType = giftlistTypesContainer.children('option:selected').val();

					return listType;
				},

				getListTypes () {
					
					let divs = $('[id^=type-]');
					let types = [];

					divs.each(function() {
						types.push($(this).attr('id').replace('type-',''));
					});

					return types;
				},

				getListConfig (typeID = this.getCurrentType()) {

					// These are a set of hidden inputs inside of #giftlistformwrapper
					let typeConfig = $(`#type-${typeID}`).val().split('#');

					let data = {};

					let dataKeys = [
						'isPublic', // 0/1/null (null = user decides)
						'showEvent', // 0/1
						'memberMin', // Number
						'memberMax', // Number
						'showAddress', // 0/1
						'eventRangeMin', // Date dd/mm/yyyy
						'eventRangeMax', // Date dd/mm/yyyy
						'participantsOptions', // Array-like string coma-separated
						'freeField1', // String
						'freeField2', // String
						'description', // String
						'needsOwnerDocument' // 0/1
					];

					$.each(typeConfig, (i, val) => {
						data[dataKeys[i]] = val;
					});

					return data;
				},

				getListsConfig () {
					
					let config = {};

					$.each(this.getListTypes(), (i, val) => {
						config[val] = this.getListConfig(val);
					});

					return config;
				}
			}
		},

		/**
		 *		Private methods
		 */

		_commonErrors : [
			// getProds error
			'{"Success":false,"Error":"Tentei 2 vezes receber os dados do checkout mas não obtive sucesso."}'
		],

		_notLogged (response) {
			return response == 'Para ver tus listas, tenes que loguearte. Hace click aquí.' || $(response).filter('.must-login').length > 0;
		},

		// Useful for html links. Returns the url of a list given it's id.
		_listURL (id) {
			return self.config.listPath + '?id=' + id;
		},

		// Useful for ajax calls. Returns the url to get all lists. List-type id/s required.
		_getListsURL (typeIDs) {
			return self.sysConfig.getListsURL.replace('{{typeIDs}}', typeIDs);
		},

		// Given the arguments, replace all the {{variables}} of an url string
		_url (url, params) {

			for(key in params) {
				url = url.replace(new RegExp('{{' + key + '}}', 'g'), params[key]);
			}

			return url;
		},

		// Handles server responses
		_success (response) {

			if(!response.Success) {
				if(self._notLogged(response.Error)) {
					e = 'not_logged';
				}
				else if(response.Error == '') {
					e = 'list_unknown';
				}
				else {
					e = 'unknown_error';
				}

				return { error:e };

			}

			return true;

			/*

				Acá voy a ir poniendo distintas respuestas del servidor hasta que esté todo bien armado.
				----------------------------------------------------------------------------------------

				newList() respuesta de creación sin sesión:
				-	{"Success":false,"Error":"Y debe estar conectado para utilizar listas de seguimiento."}
				-	{"Success":false,"Error":"\u003cul class=\u0027giftlist-save-error\u0027\u003e\r\n   \u003cli field=\u0027giftlisturl\u0027 class=\u0027error-url-length\u0027 onclick=\u0027document.getElementById(\"giftlisturl\").focus();\u0027 style=\u0027cursor:pointer;\u0027\u003eé preciso escolher uma url entre 1 e 100 caracteres para a lista\u003c/li\u003e\r\n   \u003cli field=\u0027giftlisturl\u0027 class=\u0027error-url-required\u0027 onclick=\u0027document.getElementById(\"giftlisturl\").focus();\u0027 style=\u0027cursor:pointer;\u0027\u003ea url da lista é um campo obrigatório\u003c/li\u003e\r\n\u003c/ul\u003e\r\n"}

			*/
		},

		// Parse items properly for list insertion
		_parseItems (items) {
			
			if ( $.isArray(items) ) {
				items = $.map(items, sku => `${sku}-1`);
			} else {
				items = $.map(items, (quantity, sku) => `${sku}-${quantity}`);
			}

			return items;
		},

		/**
		 *      Private method
		 *		Look for @addItem methods for documentation
		 */

		_addHandler (items, listOps, config) {

			// addToQuantity true by default
			config.addToQuantity = config.addToQuantity !== false;

			let data = {
				CheckedItems: items,
				AddToQuantity: config.addToQuantity
			}

			// New list case
			if( listOps.newList ) {
				
				data.GiftListName = listOps.name;
				data.GiftListTypeId = listOps.typeID || self.config.defListTypeID;
				
				if(typeof data.GiftListTypeId === 'undefined') {
					throw 'defListTypeID is not set, Fizzmod.Giftlists.setDefaultListType(typesID) or Fizzmod.Giftlists.setConfig({..}) must be called';
				}

			} else {
				data.GiftListId = listOps.id;
			}


			return $.Deferred(function() {
				
				let def = this;
				
				$.ajax({
					type : 'POST',
					url : config.url,
					dataType : 'json',
					contentType : 'application/json; charset=utf-8',
					data: JSON.stringify(data),
					success (response) {

						if(self._success(response).error) {
							response = false;
						} else {

							response = {

								list : new List(
									/* id 	 */	response.GiftListId,
									/* name */	listOps.name,
									/* url */	self._listURL(response.GiftListId)
								),

								isNewList		: listOps.newList,
								success			: response.Success,
								existingSkus	: response.ExistingSkus,
								insertedSKUs	: response.InsertedSkus
							};
						}

						def.resolve(response);
					},
					error() {
						def.reject();
					}
				});
			});
		},

		_beforeSubmit () {

			return $.Deferred(function() {

				let def = this;

				def.resolve();

				// self._createAddresses().done(function() { });
			});
		},

		// Needs to insert address ID linked with the user email
		_createAddresses () {

			return $.Deferred(function() {

				let def = this;
			
				let members = $('#gl-members>li');
				let addressID = $('#giftlistaddress').val();
				let pendingCreations = members.lengh-1;

				members.each(function(i) {
					if(i == 0) return true; // Ignores admin field

					let $this = $(this);
					let email = $this.find('#membermail'+(i+1)).val();
					let data = {
						userId : email,
						addressName : addressID
					};

					if( Fizzmod.Utils.isEmail(email) ) {
						GiftLists.Utils.saveAddress(data).done(function() {
							if(!--pendingCreations) {
								def.resolve();
							}
						});
					}
					else pendingCreations--;

					if(!pendingCreations) {
						def.resolve();
					}
				});
			});
		},
		

		/**
		 *      Private method
		 *		Look for @createFullList or @editFullList methods for documentation
		 */

		_editCreateFullList (data, editing) {

			return $.Deferred(function() {

				let def = this;

				self._beforeSubmit().done(function() {

					$.ajax({
						type	: 'POST',
						url		: self.sysConfig.createEditListURL,
						data	: data,
						dataType: 'HTML',
						success	() {
							// When success, returns just the list ID (data == list ID)
							if (!isNaN(data)) {
								def.resolve(data);
							}
							else if (data == '' && editing) {
								def.resolve();
							}
							else {
								def.reject();
							}
						}
					});
				});
			});
		},


		/**
		 *		Public methods
		 */


		/**
		 *		Gets all the user's list
		 *		@param [optional] {number/array} typeID - List type IDs
		 *		Success return eg: [{name:"Lista Fin de Semana",id:"1085",url:"'/giftlist/product?id=1085"},{...},...]
		 *		Failure return eg: false
		 */

		getLists (typeIDs) {
			
			if(!typeIDs) {
				// Uses default typeID
				typeIDs = self.config.listTypeIDs;

				if(typeIDs === undefined) {
					throw 'listTypeIDs is not set, Fizzmod.Giftlists.setListTypes([typeIDs]) or Fizzmod.Giftlists.setConfig({..}) must be called';
				}
			}
			else if ( ! $.isArray(typeID) ) {
				// Convert typeID to an array if number/string passed
				typeIDs = [typeIDs];
			}

			const def = $.Deferred();
				
			$.get(self._getListsURL(typeIDs), response => {
			
				if(self._notLogged(response)) {
					def.resolve(false);
					return false;
				}

				// Response comes in HTML and has to be parsed
				let lists = $.map($(response).find('.glis-ul a'), list => {
					
					list = $(list);
					
					return new List(
						list.attr('rel'),
						list.text(),
						self._listURL(list.attr('rel'))
					)
				});
				
				def.resolve(lists);
			});

			return def.promise();
		},

		/**
		 *		Gets a list's products and some data associated to it
		 *		It's almost the same as getProds()
		 */

		getList (listID) {

			return $.Deferred(function() {

				let def = this;

				self.getProds(listID).done(function(items) {

					let data = $.extend({
						items : items,
					}, self.Utils.itemsData(items));
					
					def.resolve(data);
				});
			});
		},


		/**
		 *      Gets all the list's products
		 *		@param {number} [required] listID - List unique ID
		 *		Success return eg: http://i.imgur.com/fbb40bo.png
		 *		Failure return eg: ..
		 *		--------------------------------------------------
		 *		Note: Vtex ignores pageSize
		 */

		getProds (listID) {
			
			let imgSize = 3,
				pageSize = 100;

			let req_url = self._url(self.sysConfig.getProdsURL, {
				listID	: listID,
				imgSize	: imgSize,
				pageSize: pageSize
			});

			return $.Deferred(function() {

				let def = this;
				
				$.get(req_url, function(response) {

					let error = self._notLogged(response) && !~response.indexOf(self._commonErrors[0]);
					
					if(!error) {

						let items = [];

						$.each(response.Items, function(){
							items.push(new Product(this));
						});

						def.resolve(items);

					} else {
						def.resolve(false);
					}
				});
			});
		},

		/**
		 *      Removes a product from a giftlist
		 */

		removeItem (listID, sku) {
			return self.updateProdQuantity(listID, sku, 0);
		},


		/**
		 *      Updates a product quantity
		 *      @param {type} name -
		 *		Success return eg: 
		 *		Failure return eg: ..
		 */

		updateProdQuantity (listID, sku, prodQuantity) {
			
			let req_url = self._url(self.sysConfig.changeProdAmountURL, {
				listID			: listID,
				prodSku			: sku,
				prodQuantity	: prodQuantity
			});

			return $.Deferred(function() {

				let def = this,
					req = $.post(req_url);

				req.done(function(response) {

					/*	Response:
						Amount: [number] // not final amount, but added/removed
						Operation: ["Add","Remove"]
						Success: [true,false] */

					def.resolve(response.Success, response);					
				});

				req.fail(function() {
					def.resolve(false, null);
				});
			});
		},


		/**
		 *      Creates a new list
		 *		Note it cans create lists with repeated names
		 *      @param {string} name - The name of the list to be created
		 *
		 *		Success return eg: {Success: true, InsertedSkus: 0, ExistingSkus: 0, GiftListId: 1085}
		 *		Failure return eg: {Success: false, Error: "Para ver tus listas, tenes que loguearte. Hace click aquí."}
		 */

		newList (name, typeID = self.config.defListTypeID) {

			let url = self.sysConfig.createNewListURL;

			let data = {
				GiftListName: name,
				GiftListTypeId: typeID
			}

			if(data.GiftListTypeId === undefined) {
				throw 'defListTypeID is not set, Fizzmod.Giftlists.setDefaultListType(typesID) or Fizzmod.Giftlists.setConfig({..}) must be called';
			}

			return $.Deferred(function() {
				let def = this;
				$.post(url, data, function(response) {
					def.resolve(response);
				});
			});
		},
		

		/**
		 *		Edit/create "full" list version
		 *		@param [required] {object} data	- Should be something like $('#giftlistform').serialize()
		 */

		createFullList (data) {
			return self._editCreateFullList(data);
		},

		editFullList (data) {
			return self._editCreateFullList(data, true);
		},


		/**
		 *      Deletes a list
		 *      @param {string} listID - The ID of the list to be deleted
		 *		Success return: true
		 *		Failure return (in case of not logued in): false
		 */

		deleteList (listID) {
			
			const url = self._url(self.sysConfig.deleteListURL, {listID : listID});
			
			const def = $.Deferred();

			$.post(url, response => {
				
				let success = ~response.indexOf('foi excluida') + ~response.indexOf('lista já excluida') !== 0;
				
				def.resolve(success);
			});

			return def.promise();
		},


		/**
		 *      Adds a single item to an existing list
		 *      @param [required] {number}	listID			- Giftlist ID
		 *      @param [required] {number}	item			- Item sku to be added (it's an array but accepts just 1 element)
		 *      @param [optional] {number}	quantity		- Quantity to be added, 1 by default
		 *		@param [optional] {boolean}	addToQuantity	- Decides whether to add to existing items (true), or set the new defined quantity (false). True by default.
		 *		Success return: true
		 *		Failure return (in case of not logued in or list doesn't exist): false
		 */

		addItem (listID, sku, quantity, addToQuantity) {

			// Handle for optional parameters
			if(arguments.length == 3 && typeof arguments[2] === 'boolean') {
				addToQuantity = arguments[2];
				quantity = undefined;
			}

			quantity = quantity || 1;

			let item = {};

			item[sku] = quantity;

			return self.addItems(listID, item, addToQuantity);
		},


		/**
		 *		Adds items to an existing list
		 *		@param [required] {number}			listID			- List ID
		 *		@param [required] {array/object}	items			- Array of skus to be added (adds 1 of each by default) / Object with sku and quantity to be added
		 *		@param [optional] {boolean}			addToQuantity	- Decides whether to add to existing items (true), or set the new defined quantity (false). False by default.
		 *		@example: Fizzmod.GiftLists.addItems({ 7777:3 , 1234:2 , ... }, 145);
		 *
		 *		Success return: true
		 *		Failure return (in case of not logued in or list doesn't exist): false
		 */

		addItems (listID, items, addToQuantity) {

			items = self._parseItems(items);

			let list = {
				id : listID
			};

			let config = {
				url : self.sysConfig.addItemsURL,
				addToQuantity : addToQuantity
			};

			// Calls general function
			return self._addHandler(items, list, config);
		},


		/**
		 *      Adds items to a new list
		 *		@param [required] {array/object}		items			- Array of skus to be added (adds 1 of each by default) / Object with sku and quantity to be added
		 *      @param [required] {string}				listName		- Name of the list to create
		 *      @param [optional] {number}				typeID			- Uses typeID defined in config by default
		 *		@param [optional] {boolean}				addToQuantity	- Decides whether to add to existing items (true), or set the new defined quantity (false). True by default.
		 *		Success return: true
		 *		Failure return (in case of not logued in or list doesn't exist): false
		 */

		addItemsNewList (items, listName, typeID = self.config.defListTypeID, addToQuantity) {

			items = self._parseItems(items);

			let list = {
				newList : true,
				name	: listName,
				typeID	: typeID
			};

			if(list.typeID === undefined) {
				throw 'defListTypeID is not set, Fizzmod.Giftlists.setDefaultListType(typesID) or Fizzmod.Giftlists.setConfig({..}) must be called';
			}

			let config = {
				url : self.sysConfig.addItemsNewListURL,
				addToQuantity : addToQuantity
			};

			// Calls general function
			return self._addHandler(items, list, config);
		},


		/**
		 *		Gets a list name given it's ID
		 */

		getListName (listID) {
			
			const def = $.Deferred();

			let found;
			
			self.getLists().done(function(lists) {
				
				$.each(lists, function() {

					found = this.id == listID;

					if(found) {
						def.resolve(this.name);
						return false;
					}

				});

				if( ! found ) {
					def.reject();
				}
			});
			
			return def.promise();
		},


		/**
		 *      Shares with friend/s
		 *		Uses "portal-giftlist-divulgar" Vtex Message Center template
		 *		
		 *		@param [required] {object} config - Object:
		 *				listID		: {number} ID of the list to share
		 *				fromName	: {string} name of the referer
		 *				fromEmail	: {string} email of the referer
		 *				message		: {string} custom message [optional]
		 *				friends		: [{object}] -> array with objects like { name : 'Friend Name' , email : 'Friend Email' }
		 *
		 *
		 *		Example:
		 *
		 *			Fizzmod.GiftLists.shareList({
		 *				listID		: 25,
		 *				fromName	: 'John Doe',
		 *				fromEmail	: 'j.doe@fizzmod.com',
		 *				message		: 'This is the giftlist I told you!',
		 *				friends		: [{
		 *					name  : 'Tom D.',
		 *					email : 'tom.dom@fizzmod.com'
		 *				}, {
		 *					name  : 'Peter',
		 *					email : 'peterc@fizzmod.com'
		 *				}]
		 *			}).done(function() {});
		 */

		shareList (config) {

			config = $.extend({message : ''}, config);

			return $.Deferred(function() {

				let def = this;

				// Parse friends array for sending to
				let friends = `
					<FriendsReferred>
						${$.map(config.friends, friend => `
							<Friend>
								<Name>${friend.name}</Name>
								<Email>${friend.email}</Email>
							</Friend>`).join('')};
					</FriendsReferred>`;

				let data = {
					YourName		: config.fromName,
					YourEmail		: config.fromEmail,
					Message			: config.message,
					FriendsReferred : encodeURI(friends)
				};
				
				$.ajax({
					url		: self.sysConfig.shareByEmailURL.replace('{{listID}}', config.listID),
					data	: data,
					type	: 'POST',
					success (response) {

						if( ~response.indexOf('Indicação enviada com sucesso') ) {
							def.resolve();
						}
						else {
							def.reject();
						}
					}
				});
			});
		},


		/**
		 *		Sends a list to the cart
		 */

		sendToCart (listID) {

			const def = $.Deferred();
	
			let url = self.sysConfig.sendToCart.replace('{{listID}}', listID);

			$.post(url, def.resolve);
		
			return def.promise();
		},


		/**
		 *		Gets list's product ammount and product buyed
		 */

		getBuyedQuantity (listID) {

			$.Deferred(function() {

				let def = this;

				let url = self.sysConfig.getBuyedURL
					.replace('{{listID}}', listID)
					.replace('{{imgSize}}', 1)
					.replace('{{orderURL}}', false);

				$.get(url, function(response) {

					response = $(response);

					let data = {
						total : response.find('td.glstat-table-itens').text(),
						buyed : response.find('td.glstat-table-purchased').text()
					};

					def.resolve(data);
				});
			});
		},

		/**
		 *		Giftlist search
		 *
		 *		Supported query parameters:
		 *			type : giftlist type ID/s
		 *			id : giftlist ID
		 *			name : user/(¿members?) name
		 *			surname : user/(¿members?) surname
		 *			eventlocation : event data
		 *			eventcity : event data
		 *			eventdate : event data
		 *			imagetypeid : type ID
		 *		
		 */

		search : function(query) {

			return $.Deferred(function() {

				let def = this;

				let parsedQuery = {};
				
				if( typeof query == 'object' ){
					// Parse query
					$.each(query, function(key, val) {
						parsedQuery['giftlistsearch' + key] = val;
					});

					let url = self.sysConfig.searchURL;

					$.post(url, parsedQuery, function(data) {
						let rows = $(data).find('.giftlist-body tr');
						let results = [];

						rows.each(function() {
							
							let row = $(this),
								urlList = row.attr('onclick')
											.replace('document.location="', '')
											.replace('"', ''),
								image = row.find('.giftlist-body-image').html(),
								imageId, fullImage;
							if( image != "" ){
								imageId = image.match(/(src)="([^"]*)"/i)[2].split("/")[5].split("_")[0];
								fullImage = '/arquivos/ids/'+imageId+'/';
							}else{
								imageId = "";
								fullImage = "";
							}
							
							results.push({
								id			: row.find('.giftlist-body-codigo').html(),
								name		: row.find('.giftlist-body-name').html(),
								imageId 	: imageId,
								image		: image,
								fullImage	: fullImage,
								location	: row.find('.giftlist-body-eventlocation').html(),
								city		: row.find('.giftlist-body-eventcity').html(),
								date		: row.find('.giftlist-body-eventdate').html(),
								member		: row.find('.giftlist-body-member').html(),
								url 		: urlList
							});
						});

						def.resolve({ status:'done', results:results });
					});
				}else{
					def.reject({ status:'fail', error:"No se pasaron parametros." });
				}
			});
		},

		/**
		 *		Giftlist search
		 *
		 *		Supported query parameters:
		 *			type : giftlist type ID/s
		 *			id : giftlist ID
		 *			name : user/(¿members?) name
		 *			surname : user/(¿members?) surname
		 *			eventlocation : event data
		 *			eventcity : event data
		 *			eventdate : event data
		 *			imagetypeid : type ID
		 *		
		 */

		getBuyedProducts: function(listID) {

			return $.Deferred(function() {

				let def = this;
				
				let url = self.sysConfig.getBuyedProductsURL
					.replace('{{listID}}', listID)
					.replace('{{imgSize}}', 1);

				$.post(url, function(response) {
					let $response = $(response)
						products = [];

					$response.find('ul.order-info-list li').each(function(index, value) {
						let $value = $(value);
						let product = {
							buyerName: $value.find('table.soi-outer thead th.so-nam').text(),
							buyerEmail: $value.find('table.soi-outer thead th.so-mai').text(),
							date: $value.find('table.soi-outer thead th.so-dat').text(),

							image: $value.find('table.soi-outer tbody table.soi-inner tbody td.soi-img').html(),
							name: $value.find('table.soi-outer tbody table.soi-inner tbody td.soi-nam').text(),
							quantity: $value.find('table.soi-outer tbody table.soi-inner tbody td.soi-qty').text(),
							price: $value.find('table.soi-outer tbody table.soi-inner tbody td.soi-val').text()
						};
						products.push(product);
					});

					let data = {
						total: $response.find('.order-info-total #oi-total').text(),
						products: products
					};

					def.resolve(data);
				});
			});
		}

	}.init();
	
})(jQuery, Fizzmod, window);
