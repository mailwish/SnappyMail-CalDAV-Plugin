<?php

class MailbuxCalDAVAutoPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Mailbux CalDAV Auto',
		VERSION  = '1.0',
		RELEASE  = '2025-11-12',
		CATEGORY = 'Calendar',
		DESCRIPTION = 'Auto-configures CalDAV calendar sync with JMAP support - switches per account',
		REQUIRED = '2.0.0';

	public function Init() : void
	{
		// Add custom JSON actions
		$this->addJsonHook('GetCalendarEvents', 'DoGetCalendarEvents');
		$this->addJsonHook('CreateCalendarEvent', 'DoCreateCalendarEvent');
		$this->addJsonHook('UpdateCalendarEvent', 'DoUpdateCalendarEvent');
		$this->addJsonHook('DeleteCalendarEvent', 'DoDeleteCalendarEvent');
		
		// Add JavaScript
		$this->addJs('calendar.js');
		$this->addJs('contacts-popover.js');
		
		// Add CSS
		$this->addCss('calendar.css');
	}
	
	/**
	 * Plugin configuration mapping
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('caldav_server')
				->SetLabel('CalDAV Server URL')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription('CalDAV server URL (e.g., https://my.mailbux.com/dav/cal)')
				->SetDefaultValue('https://my.mailbux.com/dav/cal'),
			\RainLoop\Plugins\Property::NewInstance('jmap_server')
				->SetLabel('JMAP Server URL')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription('JMAP server URL (e.g., https://my.mailbux.com/jmap)')
				->SetDefaultValue('https://my.mailbux.com/jmap'),
			\RainLoop\Plugins\Property::NewInstance('default_protocol')
				->SetLabel('Default Protocol')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDescription('Default protocol to use for calendar sync')
				->SetDefaultValue(['caldav', 'jmap'])
				->SetDefaultValue('caldav'),
			\RainLoop\Plugins\Property::NewInstance('auto_sync')
				->SetLabel('Auto Sync')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('Automatically sync calendar on login and account switch')
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('sync_interval')
				->SetLabel('Sync Interval (minutes)')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDescription('Auto-sync interval in minutes (0 to disable)')
				->SetDefaultValue(5)
		);
	}
	
	/**
	 * Get calendar configuration from CardDAV contacts_sync
	 */
	private function getCalendarConfig(\RainLoop\Model\Account $oAccount)
	{
		try {
			$oStorageProvider = $this->Manager()->Actions()->StorageProvider();
			if (!$oStorageProvider) {
				return null;
			}
			
			// Get contacts_sync config from CardDAV plugin
			$mData = $oStorageProvider->Get($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'contacts_sync'
			);
			
			if ($mData && \is_string($mData)) {
				$aCardDAVData = \json_decode($mData, true);
				if (\is_array($aCardDAVData) && isset($aCardDAVData['User'], $aCardDAVData['Password'])) {
					// Build CalDAV URL from CardDAV URL by replacing dav/card with dav/cal
					$sCalDAVUrl = str_replace('/dav/card/', '/dav/cal/', $aCardDAVData['Url']);
					// Remove /default suffix and let us add it ourselves
					$sCalDAVUrl = rtrim(str_replace('/default', '', $sCalDAVUrl), '/');
					
					return [
						'User' => $aCardDAVData['User'],
						'Password' => $aCardDAVData['Password'],
						'CalDAVUrl' => $sCalDAVUrl
					];
				}
			}
		} catch (\Exception $e) {
			// Silent fail
		}
		
		return null;
	}
	
	/**
	 * Make CalDAV request
	 */
	private function makeCalDAVRequest($url, $method, $username, $password, $body = null, $headers = [])
	{
		$ch = curl_init($url);
		
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
		curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
		curl_setopt($ch, CURLOPT_USERPWD, "{$username}:{$password}");
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
		
		$defaultHeaders = [
			'Content-Type: application/xml; charset=utf-8',
			'Depth: 1'
		];
		
		$allHeaders = array_merge($defaultHeaders, $headers);
		curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);
		
		if ($body) {
			curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
		}
		
		$response = curl_exec($ch);
		$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$error = curl_error($ch);
		
		curl_close($ch);
		
		return [
			'code' => $httpCode,
			'body' => $response,
			'error' => $error
		];
	}
	
	/**
	 * Make JMAP request
	 */
	private function makeJMAPRequest($url, $username, $password, $data)
	{
		$ch = curl_init($url);
		
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
		curl_setopt($ch, CURLOPT_USERPWD, "{$username}:{$password}");
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, [
			'Content-Type: application/json',
			'Accept: application/json'
		]);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
		
		$response = curl_exec($ch);
		$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$error = curl_error($ch);
		
		curl_close($ch);
		
		return [
			'code' => $httpCode,
			'body' => $response ? json_decode($response, true) : null,
			'error' => $error
		];
	}
	
	/**
	 * Parse iCalendar data
	 */
	private function parseICalendar($icalData)
	{
		$events = [];
		
		// Simple iCalendar parser
		$lines = explode("\n", str_replace("\r\n", "\n", $icalData));
		$currentEvent = null;
		
		foreach ($lines as $line) {
			$line = trim($line);
			
			if ($line === 'BEGIN:VEVENT') {
				$currentEvent = [];
			} elseif ($line === 'END:VEVENT' && $currentEvent !== null) {
				// Map to expected format
				$event = [
					'uid' => $currentEvent['uid'] ?? '',
					'summary' => $currentEvent['summary'] ?? 'Untitled',
					'dtstart' => $this->parseICalDate($currentEvent['dtstart'] ?? ''),
					'dtend' => $this->parseICalDate($currentEvent['dtend'] ?? ''),
					'description' => $currentEvent['description'] ?? '',
					'location' => $currentEvent['location'] ?? '',
					'allDay' => !isset($currentEvent['dtstart']) || strpos($currentEvent['dtstart'], 'T') === false
				];
				$events[] = $event;
				$currentEvent = null;
			} elseif ($currentEvent !== null && strpos($line, ':') !== false) {
				list($key, $value) = explode(':', $line, 2);
				// Handle properties with parameters (e.g., DTSTART;VALUE=DATE:20251112)
				$key = preg_replace('/;.*$/', '', $key);
				$currentEvent[strtolower($key)] = $value;
			}
		}
		
		return $events;
	}
	
	/**
	 * Parse iCalendar date format to ISO string
	 */
	private function parseICalDate($dateStr)
	{
		if (empty($dateStr)) {
			return date('c');
		}
		
		// Handle YYYYMMDD format
		if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $dateStr, $matches)) {
			return $matches[1] . '-' . $matches[2] . '-' . $matches[3];
		}
		
		// Handle YYYYMMDDTHHmmssZ format
		if (preg_match('/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/', $dateStr, $matches)) {
			return $matches[1] . '-' . $matches[2] . '-' . $matches[3] . 'T' . 
			       $matches[4] . ':' . $matches[5] . ':' . $matches[6] . 'Z';
		}
		
		return $dateStr;
	}
	
	/**
	 * Get calendar events
	 */
	public function DoGetCalendarEvents() : array
	{
		try {
			$oAccount = $this->Manager()->Actions()->getAccountFromToken();
			if (!$oAccount) {
				return $this->jsonResponse(__FUNCTION__, ['events' => [], 'message' => 'Please log in first']);
			}
			
			// Get config from contacts_sync (maintained by CardDAV plugin)
			$aConfig = $this->getCalendarConfig($oAccount);
			if (!$aConfig) {
				return $this->jsonResponse(__FUNCTION__, ['events' => [], 'message' => 'Calendar not configured yet. Please check settings.']);
			}
			
			// Decrypt password using MAIN account's CryptKey (same as CardDAV does)
			$oMainAccount = $this->Manager()->Actions()->GetMainAccountFromToken();
			if (!$oMainAccount || !method_exists($oMainAccount, 'CryptKey')) {
				return $this->jsonResponse(__FUNCTION__, ['events' => [], 'error' => 'Cannot access encryption key']);
			}
			
			$sCryptKey = $oMainAccount->CryptKey();
			$sPassword = \SnappyMail\Crypt::DecryptFromJSON($aConfig['Password'], $sCryptKey);
			
			if (is_object($sPassword) && method_exists($sPassword, '__toString')) {
				$sPassword = (string)$sPassword;
			}
			
			// Build CalDAV URL
			$sCalDAVUrl = $aConfig['CalDAVUrl'] . '/default/';
			
			
			// CalDAV REPORT query for events
			$sReportBody = '<?xml version="1.0" encoding="utf-8" ?>' . "\n";
			$sReportBody .= '<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">' . "\n";
			$sReportBody .= '  <D:prop>' . "\n";
			$sReportBody .= '    <D:getetag />' . "\n";
			$sReportBody .= '    <C:calendar-data />' . "\n";
			$sReportBody .= '  </D:prop>' . "\n";
			$sReportBody .= '  <C:filter>' . "\n";
			$sReportBody .= '    <C:comp-filter name="VCALENDAR">' . "\n";
			$sReportBody .= '      <C:comp-filter name="VEVENT" />' . "\n";
			$sReportBody .= '    </C:comp-filter>' . "\n";
			$sReportBody .= '  </C:filter>' . "\n";
			$sReportBody .= '</C:calendar-query>';
			
			$result = $this->makeCalDAVRequest(
				$sCalDAVUrl,
				'REPORT',
				$aConfig['User'],
				$sPassword,
				$sReportBody,
				[
					'Content-Type: application/xml; charset=utf-8',
					'Depth: 1'
				]
			);
			
			
			$aEvents = [];
			if ($result['code'] === 207) {
				// Parse multistatus response
				$aEvents = $this->parseCalDAVResponse($result['body']);
			} else {
			}
			
			return $this->jsonResponse(__FUNCTION__, ['events' => $aEvents, 'message' => 'Loaded ' . count($aEvents) . ' events']);
			
		} catch (\Exception $e) {
			return $this->jsonResponse(__FUNCTION__, ['events' => [], 'error' => $e->getMessage()]);
		}
	}
	
	/**
	 * Create calendar event
	 */
	public function DoCreateCalendarEvent() : array
	{
		try {
			
			$oAccount = $this->Manager()->Actions()->getAccountFromToken();
			if (!$oAccount) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Not logged in']);
			}
			
			
			// Get config from contacts_sync
			$aConfig = $this->getCalendarConfig($oAccount);
			if (!$aConfig) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Calendar not configured']);
			}
			
			
			// Decrypt password using MAIN account's CryptKey
			$oMainAccount = $this->Manager()->Actions()->GetMainAccountFromToken();
			
			if (!$oMainAccount || !method_exists($oMainAccount, 'CryptKey')) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Cannot access encryption key']);
			}
			
			$sCryptKey = $oMainAccount->CryptKey();
			$sPassword = \SnappyMail\Crypt::DecryptFromJSON($aConfig['Password'], $sCryptKey);
			
			if (is_object($sPassword) && method_exists($sPassword, '__toString')) {
				$sPassword = (string)$sPassword;
			}
			
			
			// Get event data from request (JS sends Title, Start, End, etc.)
			$sTitle = $this->jsonParam('Title', '');
			$sStart = $this->jsonParam('Start', '');
			$sEnd = $this->jsonParam('End', '');
			$bAllDay = $this->jsonParam('AllDay', false);
			$sDescription = $this->jsonParam('Description', '');
			$sLocation = $this->jsonParam('Location', '');
			
			
			if (empty($sTitle)) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Event title required']);
			}
			
			// Generate UID for event
			$sUid = \uniqid('event-') . '@' . $aConfig['User'];
			
			// Format dates
			// For all-day events, JS sends date-only string like "2025-11-06"
			// For timed events, JS sends ISO string with time like "2025-11-06T14:30:00.000Z"
			if ($bAllDay) {
				// Date-only string, just remove dashes: 2025-11-06 -> 20251106
				// For all-day events, use the date as-is without timezone conversion
				// This prevents the "day before" issue when user is in timezone ahead of UTC
				$sStartFormatted = str_replace('-', '', $sStart);
				$sEndFormatted = str_replace('-', '', $sEnd);
			} else {
				// For timed events, parse the ISO string and convert to UTC
				// The ISO string from JS is already in UTC (ends with Z)
				$dtStart = new \DateTime($sStart, new \DateTimeZone('UTC'));
				$dtEnd = new \DateTime($sEnd, new \DateTimeZone('UTC'));
				$sStartFormatted = $dtStart->format('Ymd\THis\Z');
				$sEndFormatted = $dtEnd->format('Ymd\THis\Z');
			}
			
			// Create iCalendar format
			$sICS = "BEGIN:VCALENDAR\r\n";
			$sICS .= "VERSION:2.0\r\n";
			$sICS .= "PRODID:-//Mailbux//CalDAV Plugin//EN\r\n";
			$sICS .= "BEGIN:VEVENT\r\n";
			$sICS .= "UID:" . $sUid . "\r\n";
			$sICS .= "DTSTAMP:" . gmdate('Ymd\THis\Z') . "\r\n";
			$sICS .= "DTSTART" . ($bAllDay ? ';VALUE=DATE' : '') . ":" . $sStartFormatted . "\r\n";
			$sICS .= "DTEND" . ($bAllDay ? ';VALUE=DATE' : '') . ":" . $sEndFormatted . "\r\n";
			$sICS .= "SUMMARY:" . $this->escapeICS($sTitle) . "\r\n";
			
			if (!empty($sDescription)) {
				$sICS .= "DESCRIPTION:" . $this->escapeICS($sDescription) . "\r\n";
			}
			if (!empty($sLocation)) {
				$sICS .= "LOCATION:" . $this->escapeICS($sLocation) . "\r\n";
			}
			
			$sICS .= "END:VEVENT\r\n";
			$sICS .= "END:VCALENDAR\r\n";
			
			// PUT event to CalDAV server
			$sEventUrl = $aConfig['CalDAVUrl'] . '/default/' . $sUid . '.ics';
			
			
			$result = $this->makeCalDAVRequest(
				$sEventUrl,
				'PUT',
				$aConfig['User'],
				$sPassword,
				$sICS,
				['Content-Type: text/calendar; charset=utf-8']
			);
			
			
			if ($result['code'] === 201 || $result['code'] === 204) {
				return $this->jsonResponse(__FUNCTION__, ['success' => true, 'uid' => $sUid]);
			} else {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'CalDAV error: ' . $result['code']]);
			}
			
		} catch (\Exception $e) {
			return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => $e->getMessage()]);
		}
	}
	
	/**
	 * Update calendar event
	 */
	public function DoUpdateCalendarEvent() : array
	{
		try {
			$oAccount = $this->Manager()->Actions()->getAccountFromToken();
			if (!$oAccount) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Not logged in']);
			}
			
			$aConfig = $this->getCalendarConfig($oAccount);
			if (!$aConfig) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Calendar not configured']);
			}
			
			$sEventId = $this->jsonParam('EventId', '');
			$sTitle = $this->jsonParam('Title', '');
			$sStart = $this->jsonParam('Start', '');
			$sEnd = $this->jsonParam('End', '');
			$bAllDay = $this->jsonParam('AllDay', false);
			
			if (!$sEventId || !$sTitle) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Event ID and title required']);
			}
			
			// Format dates
			if ($bAllDay) {
				// For all-day events, use date string directly without timezone conversion
				// JS sends date-only string like "2025-11-06" or ISO string
				// Extract date part if it's an ISO string
				$sStartDate = preg_match('/^(\d{4}-\d{2}-\d{2})/', $sStart, $mStart) ? $mStart[1] : $sStart;
				$sEndDate = preg_match('/^(\d{4}-\d{2}-\d{2})/', $sEnd, $mEnd) ? $mEnd[1] : $sEnd;
				$sStartFormatted = str_replace('-', '', $sStartDate);
				$sEndFormatted = str_replace('-', '', $sEndDate);
			} else {
				// For timed events, parse ISO string and convert to UTC
				$dtStart = new \DateTime($sStart, new \DateTimeZone('UTC'));
				$dtEnd = new \DateTime($sEnd, new \DateTimeZone('UTC'));
				$sStartFormatted = $dtStart->format('Ymd\THis\Z');
				$sEndFormatted = $dtEnd->format('Ymd\THis\Z');
			}
			
			// Create updated iCalendar
			$sICS = "BEGIN:VCALENDAR\r\n";
			$sICS .= "VERSION:2.0\r\n";
			$sICS .= "PRODID:-//Mailbux//CalDAV Plugin//EN\r\n";
			$sICS .= "BEGIN:VEVENT\r\n";
			$sICS .= "UID:" . $sEventId . "\r\n";
			$sICS .= "DTSTAMP:" . gmdate('Ymd\THis\Z') . "\r\n";
			$sICS .= "DTSTART" . ($bAllDay ? ';VALUE=DATE' : '') . ":" . $sStartFormatted . "\r\n";
			$sICS .= "DTEND" . ($bAllDay ? ';VALUE=DATE' : '') . ":" . $sEndFormatted . "\r\n";
			$sICS .= "SUMMARY:" . $this->escapeICS($sTitle) . "\r\n";
			$sICS .= "END:VEVENT\r\n";
			$sICS .= "END:VCALENDAR\r\n";
			
			// Decrypt password using MAIN account's CryptKey
			$oMainAccount = $this->Manager()->Actions()->GetMainAccountFromToken();
			if (!$oMainAccount || !method_exists($oMainAccount, 'CryptKey')) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Cannot access encryption key']);
			}
			
			$sCryptKey = $oMainAccount->CryptKey();
			$sPassword = \SnappyMail\Crypt::DecryptFromJSON($aConfig['Password'], $sCryptKey);
			
			if (is_object($sPassword) && method_exists($sPassword, '__toString')) {
				$sPassword = (string)$sPassword;
			}
			
			// PUT updated event
			$sEventUrl = rtrim($aConfig['CalDAVUrl'], '/') . '/default/' . $sEventId . '.ics';
			
			$result = $this->makeCalDAVRequest(
				$sEventUrl,
				'PUT',
				$aConfig['User'],
				$sPassword,
				$sICS,
				['Content-Type: text/calendar; charset=utf-8']
			);
			
			if ($result['code'] === 201 || $result['code'] === 204) {
				return $this->jsonResponse(__FUNCTION__, ['success' => true]);
			} else {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'CalDAV error: ' . $result['code']]);
			}
			
		} catch (\Exception $e) {
			return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => $e->getMessage()]);
		}
	}
	
	/**
	 * Delete calendar event
	 */
	public function DoDeleteCalendarEvent() : array
	{
		try {
			$oAccount = $this->Manager()->Actions()->getAccountFromToken();
			if (!$oAccount) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Not logged in']);
			}
			
			$aConfig = $this->getCalendarConfig($oAccount);
			if (!$aConfig) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Calendar not configured']);
			}
			
			$sEventId = $this->jsonParam('EventId', '');
			if (!$sEventId) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Event ID required']);
			}
			
			// Decrypt password using MAIN account's CryptKey
			$oMainAccount = $this->Manager()->Actions()->GetMainAccountFromToken();
			if (!$oMainAccount || !method_exists($oMainAccount, 'CryptKey')) {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'Cannot access encryption key']);
			}
			
			$sCryptKey = $oMainAccount->CryptKey();
			$sPassword = \SnappyMail\Crypt::DecryptFromJSON($aConfig['Password'], $sCryptKey);
			
			if (is_object($sPassword) && method_exists($sPassword, '__toString')) {
				$sPassword = (string)$sPassword;
			}
			
			// DELETE event from CalDAV server
			// URL-encode the event ID to handle @ symbols properly
			$sEventUrl = rtrim($aConfig['CalDAVUrl'], '/') . '/default/' . rawurlencode($sEventId) . '.ics';
			
			
			$result = $this->makeCalDAVRequest(
				$sEventUrl,
				'DELETE',
				$aConfig['User'],
				$sPassword
			);
			
			
			if ($result['code'] === 204 || $result['code'] === 200) {
				return $this->jsonResponse(__FUNCTION__, ['success' => true]);
			} else {
				return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => 'CalDAV error: ' . $result['code']]);
			}
			
		} catch (\Exception $e) {
			return $this->jsonResponse(__FUNCTION__, ['success' => false, 'error' => $e->getMessage()]);
		}
	}
	
	/**
	 * Escape text for iCalendar format
	 */
	private function escapeICS($text)
	{
		return str_replace(["\r\n", "\n", "\r", ",", ";"], ["\\n", "\\n", "\\n", "\\,", "\\;"], $text);
	}
	
	/**
	 * Parse CalDAV XML response
	 */
	private function parseCalDAVResponse($xml)
	{
		$events = [];
		
		try {
			$doc = new \DOMDocument();
			$doc->loadXML($xml);
			
			$xpath = new \DOMXPath($doc);
			$xpath->registerNamespace('D', 'DAV:');
			$xpath->registerNamespace('C', 'urn:ietf:params:xml:ns:caldav');
			
			$responses = $xpath->query('//D:response');
			
			foreach ($responses as $response) {
				$calendarData = $xpath->query('.//C:calendar-data', $response);
				if ($calendarData->length > 0) {
					$icalData = $calendarData->item(0)->nodeValue;
					$parsedEvents = $this->parseICalendar($icalData);
					$events = array_merge($events, $parsedEvents);
				}
			}
		} catch (\Exception $e) {
			// Silent fail
		}
		
		return $events;
	}
	
	/**
	 * Create calendar event
	 */
}
