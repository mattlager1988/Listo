import React from 'react';
import PageHeader from '../../components/PageHeader';
import DocumentList from '../../components/DocumentList';

const Documents: React.FC = () => {
  return (
    <div>
      <PageHeader title="Personal Documents" />
      <DocumentList
        module="finance"
        entityType="general"
        showUpload={true}
        showDocumentType={true}
        documentTypeEndpoint="/finance/personaldocumenttypes"
      />
    </div>
  );
};

export default Documents;
