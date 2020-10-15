<div class="file_details" id="{{image_id}}" data-wikilist="{{wiki_array}}">
	<div class="file_details_intro">
		<!-- <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/{{image}}/640px-{{image}}" alt="{{image_name}}"> -->
		<!-- <img src="https://commons.wikimedia.org/wiki/Special:FilePath/{{image}}" alt="{{image_name}}"> -->
		{{#if thumbnail_url }}
		<img src="{{thumbnail_url}}" alt="{{image_name}}">
		{{/if}}
		<h1><a style="color: var(--main)" href="https://commons.wikimedia.org/wiki/File:{{image}}" target="_blank">{{image_name}}<a></h1>
	</div>
	<div class="file_details_projects file_details_section">
		<h2>{{langDict.views.fileView.partOf}} <span>{{cat_number}}</span> {{cat_title}}</h2>
		<table>
			<tbody>
				{{#each cats}}
					<tr>
						<td>
							<span style="">{{cat_name}}</span>
						</td>
					</tr>
				{{/each}}
			</tbody>
		</table>
	</div>
	{{#if usage}}
	<div class="file_details_projects file_details_section">
		<h2>{{langDict.views.fileView.usedIn}} <span>{{usage}}</span> {{langDict.views.fileView.pagesOf}} <span>{{projects}}</span> {{langDict.views.fileView.projects}}</h2>
		<table>
			<tbody>
				{{#each wikis}}
					<tr>
						<td>
							<span style="margin-left:3em;font-size:0.7em;text-decoration:underline">{{wiki_name}}</span>
						</td>
						<td style="padding-left:2em">
							{{#each wiki_links}}
								<a href="{{wiki_link}}" style="font-size:0.9em;margin-right:2em">{{wiki_page}}</a>
							{{/each}}
						</td>
					</tr>
				{{/each}}
			</tbody>
		</table>
	</div>
	{{else}}
	{{#if recommender.length}}
	<div class="file_details_projects file_details_section">
		<h2>{{langDict.views.fileView.relatedWikidataEntities}}</h2>
		<table>
			<tbody>
			{{#each recommender}}
			<tr>
				<td>
					<a href="{{url}}" target="_blank">{{label}}</a>
				</td>
				{{#each wikis}}
				<td>
					<a href="{{url}}" style="font-size:0.9em;margin-right:2em">{{site}}</a>
				</td>
			{{/each}}
			</tr>
			{{/each}}
			</tbody>
		</table>
	</div>
	{{/if}}
	{{/if}}
	<div class="file_details_views file_details_section">
		<h2>{{langDict.views.fileView.viewsStats}}</h2>
		<table>
			<tbody>
				<tr>
					<td>{{langDict.views.fileView.totalViews}}</td>
					<td style="padding-left:2em"><span>{{tot}}</span></td>
				</tr>
				<tr>
					<td>{{langDict.views.fileView.dailyAvg}}</td>
					<td style="padding-left:2em"><span>{{av}}</span></td>
				</tr>
				<tr>
					<td>{{langDict.views.fileView.dailyMedian}}</td>
					<td style="padding-left:2em"><span>{{median}}</span></td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
