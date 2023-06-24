import express from 'express';
import xmlbuilder from 'xmlbuilder';
import { getValueFromQueryString } from '@/util';

const router: express.Router = express.Router();

router.get('/:pid/notifications', function(request: express.Request, response: express.Response): void {
	const type: string | undefined = getValueFromQueryString(request.query, 'type');
	const titleID: string | undefined = getValueFromQueryString(request.query, 'title_id');
	const pid: string | undefined = getValueFromQueryString(request.query, 'pid');

	console.log(type);
	console.log(titleID);
	console.log(pid);

	response.type('application/xml');
	response.send(xmlbuilder.create({
		result: {
			has_error: 0,
			version: 1,
			posts: ' '
		}
	}).end({ pretty: true }));
});

export default router;